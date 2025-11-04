import requests
from mcp.server.fastmcp import FastMCP
from typing import List, Dict, Any

API_BASE_URL = "http://127.0.0.1:8000"

mcp = FastMCP("AppointmentScheduler")

def http_error_handler(response: requests.Response) -> str:
    try:
        details = response.json().get("detail", "No details provided.")
    except:
        details = response.text
    return f"Error {response.status_code}: {details}"

# ------------------ TOOLS ------------------

@mcp.tool()
def add_appointment(
    doctor_id: int, 
    patient_name: str, 
    phone_number: str, 
    datetime: str
) -> str:
    """
    Add a new appointment.
    datetime must be ISO format YYYY-MM-DDTHH:MM

    **CRITICAL PRECAUTION:**
    1. DO NOT call this tool unless you have a 'doctor_id' that the user has explicitly provided or confirmed.
    2. If no 'doctor_id' is given, you MUST ask the user "Which doctor would you like to see?" and use the 'fetch_doctors' tool to find the ID.
    3. NEVER guess or make up a 'doctor_id'.
    """
    try:
        r = requests.post(
            f"{API_BASE_URL}/appointments",
            json={
                "doctor_id": doctor_id,
                "patient_name": patient_name,
                "phone_number": phone_number,
                "datetime": datetime
            }
        )
        r.raise_for_status()
        return f"✅ Appointment created: {r.json()}"
    except requests.exceptions.RequestException as e:
        return http_error_handler(e.response) if e.response else str(e)

@mcp.tool()
def cancel_appointment(appointment_id: str) -> Dict[str, str]:
    """
    Cancel an appointment by ID.
    """
    try:
        r = requests.delete(f"{API_BASE_URL}/appointments/{appointment_id}")
        r.raise_for_status()
        return {"result": "✅ Appointment cancelled successfully"}
    except requests.exceptions.RequestException as e:
        return {"result": http_error_handler(e.response) if e.response else str(e)}

@mcp.tool(name="fetch_appointments")
def fetch_appointments(doctor_id: int = None) -> Dict[str, Any]:
    """
    Fetch all appointments, optionally filtered by doctor_id.
    """
    try:
        url = f"{API_BASE_URL}/appointments"
        if doctor_id is not None:
            url += f"?doctor_id={doctor_id}"
        r = requests.get(url)
        r.raise_for_status()
        appointments = r.json()
        return {"result": appointments}
    except requests.exceptions.RequestException as e:
        return {"result": http_error_handler(e.response) if e.response else str(e)}

@mcp.tool(name="fetch_doctors")
def fetch_doctors() -> Dict[str, Any]:
    """
    Fetch all available doctors and their information.
    don't forget to use this tool to get valid doctor IDs! everytime. 
    """
    try:
        r = requests.get(f"{API_BASE_URL}/doctors")
        r.raise_for_status()
        doctors = r.json()
        return {"result": doctors}
    except requests.exceptions.RequestException as e:
        return {"result": http_error_handler(e.response) if e.response else str(e)}

# ------------------ RESOURCES (MCP Discovery API) ------------------

@mcp.tool()
def get_doctors() -> List[Dict[str, Any]]:
    """
    Get all available doctors.
    Returns a list of doctors with their details.
    don't use chat memory to get list of doctors; always call this tool.
    """
    r = requests.get(f"{API_BASE_URL}/doctors")
    r.raise_for_status()
    return r.json()

@mcp.tool()
def get_all_appointments() -> List[Dict[str, Any]]:
    """
    Get all appointments.
    Returns a list of appointments with their details.
    """
    r = requests.get(f"{API_BASE_URL}/appointments")
    r.raise_for_status()
    return r.json()
# ------------------ RUN ------------------

from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("✅ MCP Appointment Scheduler server running...")
    print("🔗 Backend API: http://127.0.0.1:8000")
    yield
    # Shutdown
    print("Shutting down...")

app = FastAPI(lifespan=lifespan)

if __name__ == "__main__":
    mcp.run()