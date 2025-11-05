
export type View = 'symptom-checker' | 'scheduler' | 'patient-profile' | 'medication-manager' | 'consultation-analyzer' | 'health-insights';

export interface MessageAction {
  text: string;
  onClick: () => void;
  style?: 'primary' | 'secondary';
}

export interface Message {
  sender: 'user' | 'ai';
  text: string;
  image?: string; // data URL for image preview
  actions?: MessageAction[];
}

export interface Doctor {
  id: number;
  name: string;
  specialty: string;
  location: string;
  availability: string[];
  isAvailableToday: boolean;
  isAvailableTomorrow: boolean;
  isAvailableDayAfter: boolean;
  isAcceptingNewPatients: boolean;
}

export interface Appointment {
  id: string;
  doctor: Doctor;
  time: string;
  day: string;
  patientName: string;
  patientEmail: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
}

export interface PatientProfile {
  name: string;
  dob: string;
  email: string;
  bloodType: string;
  allergies: string;
  medicalHistorySummary: string;
}

export interface ExtractedPatientProfile {
  name?: string;
  dob?: string;
  email?: string;
  bloodType?: string;
  allergies?: string;
}

export interface ExtractedReportData {
  summary: string;
  specialty: string;
  bookAppointment: boolean;
  patientProfile?: ExtractedPatientProfile;
}

export interface VoiceCommandResult {
    intent: 'BOOK_APPOINTMENT' | 'GENERAL_QUESTION' | 'GET_PROFILE_INFO' | 'GET_APPOINTMENTS' | 'GET_MEDICATIONS' | 'END_CONVERSATION' | 'UNKNOWN';
    specialty?: string;
    question?: string;
}


export interface Consultation {
    id: string;
    date: string;
    doctorName: string;
    notes: string;
    summary: string;
    actionItems: string[];
}

export type AgentStatus = 'idle' | 'active' | 'done' | 'skipped' | 'error';

export interface AgentState {
  id: string;
  name: string;
  status: AgentStatus;
  thought: string;
}
