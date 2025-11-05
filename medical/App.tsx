
import React, { useState, useEffect, useCallback } from 'react';
import { Appointment, Consultation, Medication, PatientProfile, View, Message, AgentState } from './types';
import SymptomChecker from './components/SymptomChecker';
import Scheduler from './components/Scheduler';
import PatientProfileComponent from './components/PatientProfile';
import MedicationManager from './components/MedicationManager';
import ConsultationAnalyzer from './components/ConsultationAnalyzer';
import HealthInsights from './components/HealthInsights';
import Header from './components/Header';
import Auth from './components/Auth';
import Loader from './components/shared/Loader';
import VoiceAssistant from './components/VoiceAssistant';
import AgentStatusPanel from './components/AgentStatusPanel';
import { MicrophoneIcon } from './components/shared/IconComponents';
import {
    onAuthStateChangedListener,
    AuthUser,
    getUserData,
    updatePatientProfile as fbUpdatePatientProfile,
    addAppointment as fbAddAppointment,
    deleteAppointment as fbDeleteAppointment,
    addMedication as fbAddMedication,
    deleteMedication as fbDeleteMedication,
    addConsultation as fbAddConsultation,
    signOutUser,
} from './services/firebaseService';

const initialAgentStates: AgentState[] = [
    { id: 'intentRouter', name: 'Intent Router', status: 'idle', thought: 'Awaiting user input.' },
    { id: 'triageRouter', name: 'Triage Router', status: 'idle', thought: 'Awaiting medical query.' },
    { id: 'clarificationAgent', name: 'Clarification Agent', status: 'idle', thought: 'Awaiting triage decision.' },
    { id: 'triageAgent', name: 'Triage Agent', status: 'idle', thought: 'Awaiting triage decision.' },
];


const App: React.FC = () => {
    const [activeView, setActiveView] = useState<View>('symptom-checker');
    const [initialSpecialty, setInitialSpecialty] = useState<string>('');
    const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false);
    
    const initialMessages: Message[] = [
        { sender: 'ai', text: "Hello! I'm your AI Medical Assistant. You can describe your symptoms for a triage recommendation, ask general health questions, or upload a medical report for analysis." }
    ];
    const [patientProfile, setPatientProfile] = useState<PatientProfile>({
        name: '', dob: '', email: '', bloodType: '', allergies: '', medicalHistorySummary: '',
    });
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [medications, setMedications] = useState<Medication[]>([]);
    const [consultations, setConsultations] = useState<Consultation[]>([]);
    const [symptomCheckerMessages, setSymptomCheckerMessages] = useState<Message[]>(initialMessages);
    const [agentStates, setAgentStates] = useState<AgentState[]>(initialAgentStates);

    useEffect(() => {
        const unsubscribe = onAuthStateChangedListener(async (user) => {
            setIsLoading(true);
            if (user) {
                setCurrentUser(user);
                const data = await getUserData(user.uid);
                if (data) {
                    setPatientProfile(data.patientProfile || { name: user.displayName || '', email: user.email || '', dob: '', bloodType: '', allergies: '', medicalHistorySummary: '' });
                    setAppointments(data.appointments || []);
                    setMedications(data.medications || []);
                    setConsultations(data.consultations || []);
                } else {
                     setPatientProfile({ name: user.displayName || '', email: user.email || '', dob: '', bloodType: '', allergies: '', medicalHistorySummary: '' });
                }
            } else {
                setCurrentUser(null);
                setPatientProfile({ name: '', dob: '', email: '', bloodType: '', allergies: '', medicalHistorySummary: '' });
                setAppointments([]);
                setMedications([]);
                setConsultations([]);
                setSymptomCheckerMessages(initialMessages);
            }
            setIsLoading(false);
        });
        return unsubscribe;
    }, []);
    
    useEffect(() => {
        if (activeView !== 'symptom-checker') {
            setAgentStates(initialAgentStates);
        }
    }, [activeView]);


    const handleUpdatePatientProfile = (updates: Partial<PatientProfile>) => {
        setPatientProfile(prev => ({ ...prev, ...updates }));
    };
    
    const handleSaveProfile = async (newProfile: PatientProfile) => {
        if (!currentUser) return;
        await fbUpdatePatientProfile(currentUser.uid, newProfile);
        setPatientProfile(newProfile);
    };

    const handleAddAppointment = async (appointment: Omit<Appointment, 'id'>): Promise<boolean> => {
        if (!currentUser) return false;
        const newAppointment = await fbAddAppointment(currentUser.uid, appointment);
        if (newAppointment) {
            setAppointments(prev => [...prev, newAppointment]);
            
            const webhookUrl = "http://localhost:5678/webhook-test/543f1b70-63db-4527-a21d-b441222b9cbc";
            const payload = {
                id: newAppointment.id,
                doctorName: newAppointment.doctor.name,
                specialty: newAppointment.doctor.specialty,
                time: newAppointment.time,
                day: newAppointment.day,
                patientName: newAppointment.patientName,
                patientEmail: newAppointment.patientEmail,
                status: 'Booked'
            };

            try {
                await fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                });
            } catch (error) {
                console.error('Failed to send appointment confirmation to webhook:', error);
            }

            return true;
        }
        return false;
    };

    const handleDeleteAppointment = useCallback(async (appointmentId: string) => {
        if (!currentUser) {
            alert("Authentication error. Please sign in again.");
            return;
        }
    
        const appointmentToCancel = appointments.find(app => app.id === appointmentId);
        if (!appointmentToCancel) {
            console.error("Could not find appointment to cancel in local state.");
            alert("Could not find the appointment to cancel. Please refresh and try again.");
            return;
        }
    
        setAppointments(prev => prev.filter(app => app.id !== appointmentId));
    
        try {
            await fbDeleteAppointment(currentUser.uid, appointmentId);
    
            const webhookUrl = "http://localhost:5678/webhook-test/543f1b70-63db-4527-a21d-b441222b9cbc";
            const payload = {
                id: appointmentToCancel.id,
                doctorName: appointmentToCancel.doctor.name,
                specialty: appointmentToCancel.doctor.specialty,
                time: appointmentToCancel.time,
                day: appointmentToCancel.day,
                patientName: appointmentToCancel.patientName,
                patientEmail: appointmentToCancel.patientEmail,
                status: 'Cancelled'
            };
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
    
        } catch (error) {
            console.error("Failed to delete appointment:", error);
            setAppointments(prev => [...prev, appointmentToCancel]);
            alert("Could not cancel the appointment. Your booking has been restored. Please try again.");
        }
    }, [currentUser, appointments]);


    const handleAddMedication = async (medication: Omit<Medication, 'id'>) => {
        if (!currentUser) return;
        const newMedication = await fbAddMedication(currentUser.uid, medication);
        if(newMedication) {
            setMedications(prev => [...prev, newMedication]);
        }
    };

    const handleDeleteMedication = useCallback(async (medicationId: string) => {
        if (!currentUser) return;

        const medicationToCancel = medications.find(med => med.id === medicationId);
        if (!medicationToCancel) {
            console.error("Could not find medication to remove in local state.");
            return;
        }

        setMedications(prev => prev.filter(med => med.id !== medicationId));

        try {
            await fbDeleteMedication(currentUser.uid, medicationId);
        } catch (error) {
            console.error("Failed to delete medication:", error);
            setMedications(prev => [...prev, medicationToCancel]);
            alert("Could not remove the medication. Please try again.");
        }
    }, [currentUser, medications]);


    const handleAddConsultation = async (consultation: Omit<Consultation, 'id'>) => {
        if (!currentUser) return;
        const newConsultation = await fbAddConsultation(currentUser.uid, consultation);
        if(newConsultation) {
            setConsultations(prev => [newConsultation, ...prev]);
        }
    };

    const requestAppointment = (specialty: string) => {
        setInitialSpecialty(specialty);
        setActiveView('scheduler');
    };
    

    const renderView = () => {
        switch (activeView) {
            case 'symptom-checker': 
                return <SymptomChecker 
                            setActiveView={setActiveView} 
                            requestAppointment={requestAppointment} 
                            updatePatientProfile={handleUpdatePatientProfile}
                            onSaveProfile={handleSaveProfile}
                            patientProfile={patientProfile}
                            messages={symptomCheckerMessages}
                            setMessages={setSymptomCheckerMessages}
                            setAgentStates={setAgentStates}
                            initialAgentStates={initialAgentStates}
                       />;
            case 'scheduler': 
                return <Scheduler 
                            appointments={appointments} 
                            addAppointment={handleAddAppointment}
                            deleteAppointment={handleDeleteAppointment}
                            patientProfile={patientProfile}
                            onSaveProfile={handleSaveProfile}
                            initialSpecialty={initialSpecialty}
                            onInitialSearchDone={() => setInitialSpecialty('')}
                       />;
            case 'patient-profile': 
                return <PatientProfileComponent profile={patientProfile} onSave={handleSaveProfile} />;
            case 'medication-manager': 
                return <MedicationManager 
                            medications={medications} 
                            addMedication={handleAddMedication} 
                            deleteMedication={handleDeleteMedication} 
                        />;
            case 'consultation-analyzer': 
                return <ConsultationAnalyzer consultations={consultations} addConsultation={handleAddConsultation} />;
            case 'health-insights': 
                return <HealthInsights />;
            default: 
                return <SymptomChecker 
                            setActiveView={setActiveView} 
                            requestAppointment={requestAppointment} 
                            updatePatientProfile={handleUpdatePatientProfile}
                            onSaveProfile={handleSaveProfile}
                            patientProfile={patientProfile}
                            messages={symptomCheckerMessages}
                            setMessages={setSymptomCheckerMessages}
                            setAgentStates={setAgentStates}
                            initialAgentStates={initialAgentStates}
                        />;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="relative w-16 h-16 flex items-center justify-center">
                    <Loader />
                </div>
            </div>
        );
    }
    
    if (!currentUser) {
        return <Auth />;
    }

    return (
        <div className="flex flex-col h-screen font-sans">
            <Header activeView={activeView} setActiveView={setActiveView} handleSignOut={signOutUser} />
             <main className="flex-1 p-4 md:p-6 overflow-hidden flex flex-row gap-4 md:gap-6">
                <div className={`h-full glassmorphic-card rounded-2xl overflow-hidden ${activeView === 'symptom-checker' ? 'flex-grow' : 'w-full'}`}>
                    {renderView()}
                </div>
                {activeView === 'symptom-checker' && (
                    <div className="hidden lg:block w-[350px] flex-shrink-0 h-full">
                       <AgentStatusPanel agentStates={agentStates} />
                    </div>
                )}
            </main>
             <button
                onClick={() => setIsVoiceAssistantOpen(true)}
                className="fixed top-28 right-6 w-16 h-16 rounded-full neon-button flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform duration-300 z-50 animate-pulse-glow"
                aria-label="Activate Voice Assistant"
            >
                <MicrophoneIcon />
            </button>
            {isVoiceAssistantOpen && (
                <VoiceAssistant
                    isOpen={isVoiceAssistantOpen}
                    onClose={() => setIsVoiceAssistantOpen(false)}
                    requestAppointment={requestAppointment}
                    patientProfile={patientProfile}
                    appointments={appointments}
                    medications={medications}
                />
            )}
        </div>
    );
};

export default App;
