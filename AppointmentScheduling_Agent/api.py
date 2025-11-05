# file: api.py

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List
from datetime import datetime

from core.scheduler import AppointmentScheduler

app = FastAPI(
    title="Appointment Scheduling API",
    description="An API to manage doctor appointments.",
    version="1.0.0"
)

scheduler = AppointmentScheduler(data_folder='data')

# --- Pydantic Models for Input/Output ---
class AppointmentRequest(BaseModel):
    doctor_id: int
    patient_name: str
    phone_number: str # <-- NEW
    datetime: str = Field(..., example="2025-11-20T14:30:00")

class AppointmentResponse(AppointmentRequest):
    appointment_id: str
    status: str

# --- API Endpoints ---
@app.get("/")
def read_root():
    return {"message": "Welcome to the Appointment Scheduling API"}

@app.get("/doctors")
def get_doctors():
    return scheduler.get_all_doctors()

@app.get("/appointments", response_model=List[AppointmentResponse])
def get_all_appointments():
    return scheduler.get_all_appointments()

@app.post("/appointments", status_code=201, response_model=AppointmentResponse)
def add_new_appointment(request: AppointmentRequest):
    """Schedules a new appointment."""
    success, message, new_appt = scheduler.add_appointment(
        doctor_id=request.doctor_id,
        patient_name=request.patient_name,
        dt_string=request.datetime,
        phone_number=request.phone_number # <-- NEW
    )
    if not success:
        raise HTTPException(status_code=409, detail=message) # 409 Conflict
    return new_appt

@app.delete("/appointments/{appointment_id}", status_code=200)
def cancel_an_appointment(appointment_id: str):
    """Cancels an appointment using its unique ID."""
    success, message = scheduler.cancel_appointment(appointment_id)
    if not success:
        raise HTTPException(status_code=404, detail=message) # 404 Not Found
    return {"message": message}