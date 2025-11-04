
---

# Agentic Appointment Scheduling System

## Overview

The **Agentic Appointment Scheduling System** automates the process of booking, rescheduling, and managing appointments with doctors using an agentic framework.
The system integrates an **MCP (Multi-Capability Protocol)** interface, API-based communication, and an optional dashboard for visualization.

---

## Objectives

* To design an AI-based agent capable of handling appointment-related tasks.
* To demonstrate multi-component interaction through API and MCP servers.
* To enable both programmatic and visual monitoring of appointments.

---

## System Capabilities

The agent can perform the following actions:

* **add_appointment** – Create a new appointment.
* **cancel_appointment** – Cancel an existing appointment.
* **reschedule_appointment** – Modify the time or date of an appointment.
* **get_doctors** – Retrieve the list of available doctors.
* **get_all_appointments** – Display all scheduled appointments.

---

## Project Structure

```
appointment_scheduling_agent/
│
├── as_2/
│   ├── api.py               # Core FastAPI server handling API requests
│   ├── dashboard.py         # Optional Streamlit dashboard for visualization
│   ├── core/                # Core modules and helper functions
│   ├── data/                # Data storage for appointments and doctors
│   ├── server/              # MCP server implementation
│   ├── requirements.txt     # Python dependencies
│   └── __pycache__/         # Compiled cache files
```

---

## Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/<your-username>/appointment_scheduling_agent.git
cd appointment_scheduling_agent/as_2
```

### Step 2: Create a Virtual Environment

```bash
python -m venv venv
source venv/bin/activate    # For Windows: venv\Scripts\activate
```

### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

---

## How to Run the System

This system requires **at least two (and optionally three)** separate terminals to run all components.

---

### **Terminal 1: Run the Core API (FastAPI)**

This must be running for other components to work.

```bash
uvicorn api:app --reload --port 8000
```

**What it does:**
Starts the central API hub at [http://127.0.0.1:8000](http://127.0.0.1:8000).
This handles all appointment and doctor data.

---

### **Terminal 2: Run the AI Agent Bridge (MCP)**

This connects the AI agent to the backend API.

```bash
uvicorn server.main:mcp --reload --port 8001
```

**What it does:**
Starts the MCP server at [http://127.0.0.1:8001](http://127.0.0.1:8001).
The AI agent (e.g., Claude or other compatible agents) connects here to access scheduling tools.

---

### **Terminal 3: Run the Dashboard (Optional)**

This visual dashboard helps monitor and manage appointments.

```bash
streamlit run dashboard.py
```

**What it does:**
Launches a dashboard view in your browser for easier interaction and visualization.

---

## 📋 API Endpoints

Once the API server is running, you can interact with it through the Swagger interface at
👉 [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

| Method     | Endpoint             | Description                          |
| ---------- | -------------------- | ------------------------------------ |
| **POST**   | `/appointments`      | Schedule a new appointment           |
| **GET**    | `/appointments`      | Retrieve all scheduled appointments  |
| **DELETE** | `/appointments/{id}` | Cancel a specific appointment by ID  |
| **GET**    | `/doctors`           | Retrieve a list of available doctors |

---

## Example Prompts

You can test the system with the following natural language prompts:

* “Book an appointment with Dr. Ramesh Gupta for 11 AM tomorrow.”
* “Cancel my appointment with Dr. Sushma Desai.”
* “Reschedule my appointment with Dr. Sunita Sharma to Friday 3 PM.”
* “Show all my appointments.”
* “List available doctors.”

---

## Technologies Used

* **Python 3.10+**
* **FastAPI**
* **FastMCP Framework**
* **Streamlit (Dashboard)**
* **JSON for Data Storage**

---

## Author

**Avinesh Valsan** and **Tanavi Nipanicar**
<br>MSc in Artificial Intelligence
<br>Goa University

---

