# file: core/scheduler.py

import json
from datetime import datetime, timedelta  # <-- CHANGED: Import timedelta
from pathlib import Path
import uuid

class AppointmentScheduler:
    """
    Handles all core logic for scheduling, managing, and querying appointments.
    It reads from and writes to JSON files, acting as a simple database.
    """
    def __init__(self, data_folder='data'):
        self.data_path = Path(data_folder)
        self.doctors_file = self.data_path / 'doctors.json'
        self.appointments_file = self.data_path / 'appointments.json'
        self._ensure_data_files_exist()
        
        self.doctors = self._load_data(self.doctors_file)
        self.appointments = self._load_data(self.appointments_file)

    def _ensure_data_files_exist(self):
        # ... (no changes in this method)
        self.data_path.mkdir(exist_ok=True)
        if not self.doctors_file.exists():
            with open(self.doctors_file, 'w') as f:
                json.dump([], f)
        if not self.appointments_file.exists():
            with open(self.appointments_file, 'w') as f:
                json.dump([], f)

    def _load_data(self, filepath):
        # ... (no changes in this method)
        try:
            with open(filepath, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return []

    def _save_appointments(self):
        # ... (no changes in this method)
        with open(self.appointments_file, 'w') as f:
            json.dump(self.appointments, f, indent=4)
            
    def _is_conflict(self, doctor_id, dt_string):
        """
        Checks for conflicts with a 30-minute gap.
        An appointment at 10:00 blocks the doctor from 9:31 to 10:29.
        """
        # <-- THIS ENTIRE METHOD IS REWRITTEN -->
        
        new_dt = datetime.fromisoformat(dt_string)
        # Define the buffer (29 minutes, so 30 minutes apart is valid)
        gap = timedelta(minutes=29) 

        for appt in self.appointments:
            if appt['doctor_id'] == doctor_id:
                existing_dt = datetime.fromisoformat(appt['datetime'])
                
                # Calculate the conflict window for the existing appointment
                conflict_start = existing_dt - gap
                conflict_end = existing_dt + gap
                
                # Check if the new appointment falls within the blocked window
                if conflict_start <= new_dt <= conflict_end:
                    return True # It's a conflict
        
        return False # No conflicts found

    def add_appointment(self, doctor_id, patient_name, dt_string, phone_number):
        """
        Adds a new appointment after checking ALL business rules.
        """
        # <-- NEW VALIDATION LOGIC ADDED -->
        
        # RULE 1: Check for Past Date
        try:
            new_appt_time = datetime.fromisoformat(dt_string)
        except ValueError:
            return False, "Error: Invalid datetime format. Use ISO format (YYYY-MM-DDTHH:MM:SS).", None
            
        if new_appt_time < datetime.now():
            return False, "Error: Cannot book appointments in the past.", None
        
        # RULE 2: Check for Max 2 Upcoming Appointments per Phone Number
        now_str = datetime.now().isoformat()
        upcoming_appts_for_phone = [
            appt for appt in self.appointments 
            if appt['phone_number'] == phone_number and appt['datetime'] >= now_str
        ]
        
        if len(upcoming_appts_for_phone) >= 2:
            return False, "Error: A maximum of 2 upcoming appointments are allowed per phone number.", None

        # Check if doctor exists (existing check)
        if not any(doc['doctor_id'] == doctor_id for doc in self.doctors):
            return False, "Error: Doctor ID not found.", None

        # RULE 3: Check for 30-Minute Gap Conflict (existing check, now smarter)
        if self._is_conflict(doctor_id, dt_string):
            return False, f"Error: Doctor {doctor_id} has a conflicting appointment within 30 minutes of {dt_string}.", None
            
        # All checks passed, create the appointment
        new_appointment = {
            "appointment_id": str(uuid.uuid4()),
            "doctor_id": doctor_id,
            "patient_name": patient_name,
            "datetime": dt_string,
            "phone_number": phone_number,
            "status": "scheduled"
        }
        self.appointments.append(new_appointment)
        self._save_appointments()
        return True, "Appointment added successfully.", new_appointment

    def cancel_appointment(self, appointment_id):
        # ... (no changes in this method)
        initial_count = len(self.appointments)
        self.appointments = [appt for appt in self.appointments if appt['appointment_id'] != appointment_id]
        
        if len(self.appointments) < initial_count:
            self._save_appointments()
            return True, f"Appointment {appointment_id} canceled successfully."
        else:
            return False, f"Error: Appointment ID {appointment_id} not found."

    def get_all_doctors(self):
        # ... (no changes in this method)
        return self.doctors

    def get_all_appointments(self):
        # ... (no changes in this method)
        self.appointments.sort(key=lambda x: x['datetime'])
        return self.appointments

    def get_upcoming_appointments(self):
        # ... (no changes in this method)
        now_str = datetime.now().isoformat()
        upcoming = [appt for appt in self.appointments if appt['datetime'] >= now_str]
        upcoming.sort(key=lambda x: x['datetime'])
        return upcoming