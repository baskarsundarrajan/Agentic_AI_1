# file: dashboard.py

import streamlit as st
import requests
import pandas as pd
from datetime import datetime, timedelta

# --- Configuration ---
API_BASE_URL = "http://127.0.0.1:8000"

# --- Helper Functions ---
def get_doctors():
    try:
        response = requests.get(f"{API_BASE_URL}/doctors")
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        st.error(f"Error fetching doctors: {e}")
        return []

def get_appointments():
    try:
        response = requests.get(f"{API_BASE_URL}/appointments")
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        st.error(f"Error fetching appointments: API server might not be running.")
        return []

# --- Streamlit UI ---
st.set_page_config(page_title="Appointments Dashboard", layout="wide")

st.title("🗓️ Appointment Scheduling Dashboard")
st.markdown("Real-time appointment management and doctor directory")

# --- Fetch Data ---
appointments_data = get_appointments()
doctors_data = get_doctors()

if appointments_data and doctors_data:
    # --- Data Processing ---
    df_appointments = pd.DataFrame(appointments_data)
    df_doctors = pd.DataFrame(doctors_data)
    
    # Merge to get doctor information
    if 'doctor_id' in df_appointments.columns and 'doctor_id' in df_doctors.columns:
        df = pd.merge(df_appointments, df_doctors, on="doctor_id", how="left", suffixes=('', '_doctor'))
    else:
        df = df_appointments
    
    # Convert datetime string to datetime object
    df['datetime_obj'] = pd.to_datetime(df['datetime'])
    
    # Filter for upcoming appointments only
    now = datetime.now()
    df_upcoming = df[df['datetime_obj'] > now].sort_values(by='datetime_obj').reset_index(drop=True)

    # --- Key Metrics ---
    st.subheader("📊 Quick Metrics")
    
    col1, col2, col3, col4 = st.columns(4)
    
    start_of_week = now - timedelta(days=now.weekday())
    end_of_week = start_of_week + timedelta(days=6)
    
    appointments_this_week = df_upcoming[
        (df_upcoming['datetime_obj'].dt.date >= start_of_week.date()) & 
        (df_upcoming['datetime_obj'].dt.date <= end_of_week.date())
    ].shape[0]
    
    col1.metric("📅 Total Upcoming", len(df_upcoming))
    col2.metric("🔔 This Week", appointments_this_week)
    col3.metric("👨‍⚕️ Active Doctors", len(df_doctors))
    col4.metric("⏰ Today's Appointments", df_upcoming[df_upcoming['datetime_obj'].dt.date == now.date()].shape[0])
    
    st.divider()

    # --- Main Content Tabs ---
    tab1, tab2, tab3 = st.tabs(["📞 Patient Contact Queue", "👨‍⚕️ Doctor Directory", "📋 All Appointments History"])

    # --- TAB 1: Patient Contact Queue ---
    with tab1:
        st.subheader("Upcoming Appointments - Call Reminders")
        
        if not df_upcoming.empty:
            # Sort by datetime to show earliest first
            df_upcoming_sorted = df_upcoming.sort_values(by='datetime_obj')
            
            for idx, appt in df_upcoming_sorted.iterrows():
                # Create highlighted box for each appointment
                appt_time = pd.to_datetime(appt['datetime_obj'])
                time_until = appt_time - now
                hours_until = int(time_until.total_seconds() / 3600)
                
                # Color code based on urgency
                if hours_until <= 2:
                    border_color = "🔴"
                    urgency_label = "URGENT"
                elif hours_until <= 24:
                    border_color = "🟠"
                    urgency_label = "HIGH PRIORITY"
                else:
                    border_color = "🟢"
                    urgency_label = "SCHEDULED"
                
                # Create a visually distinct box
                with st.container():
                    col1, col2 = st.columns([3, 1])
                    
                    with col1:
                        st.markdown(f"""
                        <div style="
                            background-color: #f0f2f6;
                            padding: 15px;
                            border-left: 5px solid {'#ff4444' if hours_until <= 2 else '#ff9900' if hours_until <= 24 else '#00cc00'};
                            border-radius: 5px;
                            margin: 10px 0;
                        ">
                            <h4 style="margin: 0 0 10px 0;">{border_color} {appt.get('patient_name', 'N/A')} - {urgency_label}</h4>
                            <p style="margin: 5px 0;"><b>📱 Phone:</b> {appt.get('phone_number', 'N/A')}</p>
                            <p style="margin: 5px 0;"><b>👨‍⚕️ Doctor:</b> {appt.get('name', 'N/A')} ({appt.get('specialty', 'N/A')})</p>
                            <p style="margin: 5px 0;"><b>🕐 Time:</b> {appt_time.strftime('%A, %B %d at %I:%M %p')}</p>
                            <p style="margin: 5px 0; font-size: 12px; color: #666;"><b>ID:</b> {appt.get('appointment_id', 'N/A')}</p>
                        </div>
                        """, unsafe_allow_html=True)
                    
                    with col2:
                        st.caption(f"In {hours_until}h" if hours_until > 0 else "NOW")
        else:
            st.info("✅ No upcoming appointments found.")

    # --- TAB 2: Doctor Directory ---
    with tab2:
        st.subheader("Available Doctors")
        
        if not df_doctors.empty:
            # Get doctor stats
            doctor_stats = {}
            for _, doctor in df_doctors.iterrows():
                doc_id = doctor['doctor_id']
                appts_count = len(df_upcoming[df_upcoming['doctor_id'] == doc_id])
                doctor_stats[doc_id] = appts_count
            
            # Display doctors in a grid
            cols = st.columns(2)
            
            for idx, (_, doctor) in enumerate(df_doctors.iterrows()):
                doc_id = doctor['doctor_id']
                upcoming_count = doctor_stats.get(doc_id, 0)
                
                with cols[idx % 2]:
                    st.markdown(f"""
                    <div style="
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 20px;
                        border-radius: 8px;
                        margin: 10px 0;
                    ">
                        <h3 style="margin: 0;">{doctor.get('name', 'N/A')}</h3>
                        <p style="margin: 5px 0; font-size: 16px; opacity: 0.9;">
                            <b>{doctor.get('specialty', 'N/A')}</b>
                        </p>
                        <hr style="margin: 10px 0; opacity: 0.3;">
                        <p style="margin: 5px 0;">
                            📅 <b>Upcoming Appointments:</b> {upcoming_count}
                        </p>
                        <p style="margin: 5px 0; font-size: 12px; opacity: 0.8;">
                            ID: {doc_id}
                        </p>
                    </div>
                    """, unsafe_allow_html=True)
        else:
            st.info("No doctors found.")

    # --- TAB 3: All Appointments History ---
    with tab3:
        st.subheader("Complete Appointment Records")
        
        if not df.empty:
            # Prepare display dataframe
            df_display = df[['appointment_id', 'datetime', 'patient_name', 'phone_number', 'name', 'specialty']].copy()
            
            # Rename columns for better display
            df_display.columns = ['Appointment ID', 'Date & Time', 'Patient Name', 'Phone Number', 'Doctor', 'Specialty']
            
            # Sort by datetime (most recent first)
            df_display = df_display.sort_values(by='Date & Time', ascending=False)
            
            # Add status column
            df_display['Status'] = df_display['Date & Time'].apply(
                lambda x: '✅ Completed' if pd.to_datetime(x) < now else '🔔 Upcoming'
            )
            
            # Reorder columns
            df_display = df_display[['Status', 'Date & Time', 'Patient Name', 'Phone Number', 'Doctor', 'Specialty', 'Appointment ID']]
            
            # Display metrics for this view
            completed = len(df[df['datetime_obj'] < now])
            upcoming = len(df[df['datetime_obj'] > now])
            
            col1, col2 = st.columns(2)
            col1.metric("✅ Completed Appointments", completed)
            col2.metric("🔔 Upcoming Appointments", upcoming)
            
            st.divider()
            
            # Display as interactive table
            st.dataframe(
                df_display,
                use_container_width=True,
                hide_index=True,
                column_config={
                    "Appointment ID": st.column_config.TextColumn(width="small"),
                    "Date & Time": st.column_config.TextColumn(width="medium"),
                    "Patient Name": st.column_config.TextColumn(width="medium"),
                    "Phone Number": st.column_config.TextColumn(width="small"),
                    "Doctor": st.column_config.TextColumn(width="medium"),
                    "Specialty": st.column_config.TextColumn(width="small"),
                    "Status": st.column_config.TextColumn(width="small"),
                }
            )
            
            # Export option
            st.divider()
            csv = df_display.to_csv(index=False)
            st.download_button(
                label="📥 Download as CSV",
                data=csv,
                file_name=f"appointments_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                mime="text/csv"
            )
        else:
            st.info("No appointment records found.")

else:
    st.warning("⚠️ Could not load appointment data. Please ensure the API is running on http://127.0.0.1:8000")