import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { firebaseConfig } from '../firebaseConfig';
import { Appointment, Consultation, Medication, PatientProfile } from '../types';

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
export const auth = firebase.auth();
export const db = firebase.firestore();

// --- AUTHENTICATION ---
export type AuthUser = firebase.User;

export const onAuthStateChangedListener = (callback: (user: AuthUser | null) => void) => {
    return auth.onAuthStateChanged(callback);
}

export const signUpUser = async (email: string, password: string, displayName: string) => {
    if (!email || !password) return;
    const { user } = await auth.createUserWithEmailAndPassword(email, password);
    if (user) {
        await user.updateProfile({ displayName });
        // Create initial user document in Firestore
        await db.collection('users').doc(user.uid).set({
            patientProfile: { name: displayName, dob: '', bloodType: '', allergies: '', medicalHistorySummary: '' }
        });
    }
    return user;
};

export const signInUser = async (email: string, password: string) => {
    if (!email || !password) return;
    return await auth.signInWithEmailAndPassword(email, password);
};

export const signOutUser = async () => await auth.signOut();

export const sendPasswordResetEmail = async (email: string) => await auth.sendPasswordResetEmail(email);

// --- FIRESTORE DATABASE ---

// Helper to get the user's main document reference
const getUserDocRef = (userId: string) => db.collection('users').doc(userId);

// Fetch all data for a user
export const getUserData = async (userId: string) => {
    const userDocRef = getUserDocRef(userId);
    const docSnap = await userDocRef.get();
    if (docSnap.exists) {
        const data = docSnap.data();
        const profileData = data?.patientProfile;
                
        // Fetch data from subcollections
        const appointments = await getAppointments(userId);
        const medications = await getMedications(userId);
        const consultations = await getConsultations(userId);

        return {
            patientProfile: profileData,
            appointments,
            medications,
            consultations,
        };
    } else {
        console.log("No such document for user!");
        return null;
    }
};

// --- Patient Profile ---
export const updatePatientProfile = async (userId: string, profile: PatientProfile) => {
    const userDocRef = getUserDocRef(userId);
    await userDocRef.set({ patientProfile: profile }, { merge: true });
};


// --- Appointments ---
export const addAppointment = async (userId: string, appointment: Omit<Appointment, 'id'>): Promise<Appointment | null> => {
    try {
        const appointmentsColRef = db.collection('users').doc(userId).collection('appointments');
        const docRef = await appointmentsColRef.add(appointment);
        return { ...appointment, id: docRef.id };
    } catch(e) {
        console.error("Error adding appointment: ", e);
        return null;
    }
};

export const getAppointments = async (userId: string): Promise<Appointment[]> => {
    const appointmentsColRef = db.collection('users').doc(userId).collection('appointments');
    const snapshot = await appointmentsColRef.get();
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Appointment));
};

export const deleteAppointment = async (userId: string, appointmentId: string): Promise<void> => {
    try {
        const appointmentDocRef = db.collection('users').doc(userId).collection('appointments').doc(appointmentId);
        await appointmentDocRef.delete();
    } catch (e) {
        console.error("Error deleting appointment:", e);
        throw e;
    }
};


// --- Medications ---
export const addMedication = async (userId: string, medication: Omit<Medication, 'id'>): Promise<Medication | null> => {
    try {
        const medicationsColRef = db.collection('users').doc(userId).collection('medications');
        const docRef = await medicationsColRef.add(medication);
        return { ...medication, id: docRef.id };
    } catch (e) {
        console.error("Error adding medication: ", e);
        return null;
    }
};

export const getMedications = async (userId: string): Promise<Medication[]> => {
    const medicationsColRef = db.collection('users').doc(userId).collection('medications');
    const snapshot = await medicationsColRef.get();
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Medication));
};

export const deleteMedication = async (userId: string, medicationId: string): Promise<void> => {
    try {
        const medicationDocRef = db.collection('users').doc(userId).collection('medications').doc(medicationId);
        await medicationDocRef.delete();
    } catch (e) {
        console.error("Error deleting medication:", e);
        throw e;
    }
};


// --- Consultations ---
export const addConsultation = async (userId: string, consultation: Omit<Consultation, 'id'>): Promise<Consultation | null> => {
    try {
        const consultationsColRef = db.collection('users').doc(userId).collection('consultations');
        const docRef = await consultationsColRef.add(consultation);
        return { ...consultation, id: docRef.id };
    } catch(e) {
        console.error("Error adding consultation: ", e);
        return null;
    }
};

export const getConsultations = async (userId: string): Promise<Consultation[]> => {
    const consultationsColRef = db.collection('users').doc(userId).collection('consultations');
    const snapshot = await consultationsColRef.get();
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Consultation));
};