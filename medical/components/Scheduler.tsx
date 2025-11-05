


import React, { useState, useEffect } from 'react';
import { Doctor, Appointment, PatientProfile } from '../types';
import { doctorsData } from '../data/doctors';

interface SchedulerProps {
    appointments: Appointment[];
    addAppointment: (appointment: Omit<Appointment, 'id'>) => Promise<boolean>;
    deleteAppointment: (appointmentId: string) => Promise<void>;
    patientProfile: PatientProfile;
    onSaveProfile: (updatedProfile: PatientProfile) => Promise<void>;
    initialSpecialty: string;
    onInitialSearchDone: () => void;
}

const DayButton: React.FC<{ day: string; selectedDay: string; setSelectedDay: (day: string) => void; }> = ({ day, selectedDay, setSelectedDay }) => (
    <button
        onClick={() => setSelectedDay(day)}
        className={`px-4 py-2 text-sm font-orbitron font-semibold rounded-full transition-all duration-300 transform hover:scale-105 ${
            selectedDay === day 
            ? 'bg-cyan-400/20 text-teal-300 shadow-[0_0_10px_rgba(100,255,218,0.5)]' 
            : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
        }`}
    >
        {day}
    </button>
);

const Scheduler: React.FC<SchedulerProps> = ({ appointments, addAppointment, deleteAppointment, patientProfile, onSaveProfile, initialSpecialty, onInitialSearchDone }) => {
  const [specialty, setSpecialty] = useState(initialSpecialty || '');
  const [location, setLocation] = useState('');
  const [selectedDay, setSelectedDay] = useState('Today');
  const [acceptingNewPatients, setAcceptingNewPatients] = useState(false);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [isBooking, setIsBooking] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState<string | null>(null);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [stagedBooking, setStagedBooking] = useState<{ doctor: Doctor; time: string; day: string } | null>(null);
  const [profileModalData, setProfileModalData] = useState<Partial<PatientProfile>>({});
  
  const inputStyles = "w-full p-2 bg-slate-800/70 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-400 text-slate-100 border border-slate-600 placeholder-slate-400";


  const handleSearch = () => {
    const results = doctorsData.filter(doctor => {
        let isAvailable = false;
        if (selectedDay === 'Today') isAvailable = doctor.isAvailableToday;
        else if (selectedDay === 'Tomorrow') isAvailable = doctor.isAvailableTomorrow;
        else if (selectedDay === 'Day after tomorrow') isAvailable = doctor.isAvailableDayAfter;

        return (
            (specialty === '' || doctor.specialty.toLowerCase().includes(specialty.toLowerCase())) &&
            (location === '' || doctor.location.toLowerCase().includes(location.toLowerCase())) &&
            isAvailable &&
            (!acceptingNewPatients || doctor.isAcceptingNewPatients === true)
        );
    });
    setFilteredDoctors(results);
  };
  
  useEffect(() => {
    // Run search automatically when filters change
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialty, location, selectedDay, acceptingNewPatients]);

  useEffect(() => {
    if (initialSpecialty) {
        setSpecialty(initialSpecialty);
        onInitialSearchDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const proceedWithBooking = async (doctor: Doctor, time: string, day: string, currentProfile: PatientProfile) => {
    const bookingId = `${doctor.id}-${time}`;
    setIsBooking(bookingId);
    const newAppointment: Omit<Appointment, 'id'> = {
      doctor,
      time,
      day,
      patientName: currentProfile.name,
      patientEmail: currentProfile.email,
    };
    
    const success = await addAppointment(newAppointment);
    
    if (success) {
      alert(`Appointment confirmed with ${doctor.name} for ${day} at ${time}! A confirmation email has been sent.`);
    } else {
      alert(`We couldn't confirm your appointment at this time. Please check your connection and try again.`);
    }
    setIsBooking(null);
  };

  const handleBook = async (doctor: Doctor, time: string, day: string) => {
    const { name, email, dob } = patientProfile;
    if (!name || !email || !dob) {
      setProfileModalData({ name, email, dob });
      setStagedBooking({ doctor, time, day });
      setIsProfileModalOpen(true);
      return;
    }
    await proceedWithBooking(doctor, time, day, patientProfile);
  };

  const handleProfileModalSave = async () => {
    if (!profileModalData.name || !profileModalData.email || !profileModalData.dob) {
        alert('Please fill in your name, email, and date of birth to continue.');
        return;
    }
    
    const updatedProfile = { ...patientProfile, ...profileModalData };
    await onSaveProfile(updatedProfile);
    
    setIsProfileModalOpen(false);

    if (stagedBooking) {
        await proceedWithBooking(stagedBooking.doctor, stagedBooking.time, stagedBooking.day, updatedProfile);
        setStagedBooking(null);
    }
  };


  const handleCancel = (appointmentId: string) => {
    if (window.confirm("Are you sure you want to cancel this appointment? This action cannot be undone.")) {
        setIsCancelling(appointmentId);
        // The parent component (`App.tsx`) handles the async logic,
        // optimistic updates, rollbacks, and alerts. We just call it
        // and use `.finally()` to clean up our local loading state.
        deleteAppointment(appointmentId).finally(() => {
            setIsCancelling(null);
        });
    }
  };

  return (
    <div className="p-6 h-full flex flex-col text-slate-200">
      <h2 className="text-xl font-bold text-slate-100 mb-4 text-center">Automated Scheduling</h2>
      <div className="space-y-4 mb-6 p-4 bg-slate-900/40 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Specialty (e.g., Cardiology)"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="p-2 bg-slate-800/70 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-400 text-slate-100 border border-slate-600"
            />
            <input
              type="text"
              placeholder="Location (e.g., Panjim)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="p-2 bg-slate-800/70 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-400 text-slate-100 border border-slate-600"
            />
            <div className="flex items-center justify-center bg-slate-800/70 p-2 border border-slate-600 rounded-md">
                <input type="checkbox" id="acceptingNew" checked={acceptingNewPatients} onChange={e => setAcceptingNewPatients(e.target.checked)} className="h-4 w-4 rounded bg-slate-700 border-slate-500 text-teal-400 focus:ring-teal-500" />
                <label htmlFor="acceptingNew" className="ml-2 text-sm font-medium text-slate-300">Accepting New Patients</label>
            </div>
        </div>
        <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-slate-300">Availability:</label>
            <DayButton day="Today" selectedDay={selectedDay} setSelectedDay={setSelectedDay} />
            <DayButton day="Tomorrow" selectedDay={selectedDay} setSelectedDay={setSelectedDay} />
            <DayButton day="Day after tomorrow" selectedDay={selectedDay} setSelectedDay={setSelectedDay} />
        </div>
      </div>

      <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">
        {/* Upcoming Appointments Column */}
        <div className="flex flex-col h-full overflow-hidden">
          <h3 className="text-lg font-semibold mb-2 flex-shrink-0 text-slate-100 font-orbitron">Upcoming Appointments</h3>
          <div className="flex-grow overflow-y-auto pr-2">
            {appointments.length > 0 ? (
              <ul className="space-y-3">
                {appointments.map(app => (
                  <li key={app.id} className="p-3 bg-teal-900/50 text-green-200 border border-teal-700/60 rounded-lg text-sm flex justify-between items-center">
                    <div>
                      <strong className="text-teal-200">{app.day} at {app.time}</strong>
                      <p className="text-slate-300">with {app.doctor.name} ({app.doctor.specialty})</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => handleCancel(app.id)} 
                            disabled={isCancelling === app.id}
                            className="text-xs bg-slate-700/90 text-slate-200 hover:bg-red-500/60 hover:text-white font-semibold px-3 py-1.5 rounded-full transition-all duration-200 transform hover:scale-105 border border-slate-600 hover:border-red-500/80 disabled:opacity-50 disabled:cursor-wait"
                        >
                            {isCancelling === app.id ? 'Cancelling...' : 'Cancel'}
                        </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="text-slate-400 text-sm">No upcoming appointments.</p>}
          </div>
        </div>

        {/* Available Doctors Column */}
        <div className="flex flex-col h-full overflow-hidden">
            <h3 className="text-lg font-semibold mb-2 flex-shrink-0 text-slate-100">Available Doctors ({filteredDoctors.length})</h3>
            <div className="space-y-4 overflow-y-auto pr-2 flex-grow">
              {filteredDoctors.length > 0 ? filteredDoctors.map(doctor => (
                <div key={doctor.id} className="p-4 border border-slate-700 rounded-lg bg-slate-800/50">
                  <h4 className="font-bold text-teal-300">{doctor.name}</h4>
                  <p className="text-sm text-slate-400">{doctor.specialty} - {doctor.location}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {doctor.availability.map(time => (
                      <button 
                        key={time} 
                        onClick={() => handleBook(doctor, time, selectedDay)} 
                        disabled={isBooking === `${doctor.id}-${time}`}
                        className="bg-cyan-400/20 text-cyan-200 text-xs font-semibold px-3 py-1 rounded-full hover:bg-cyan-400/40 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-wait"
                      >
                        {isBooking === `${doctor.id}-${time}` ? 'Booking...' : time}
                      </button>
                    ))}
                  </div>
                </div>
              )) : <p className="text-slate-400 text-sm">No doctors found. Please adjust your search criteria.</p>}
            </div>
        </div>
      </div>

      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="glassmorphic-card p-6 rounded-lg w-full max-w-md space-y-4 border-2 border-teal-400/50 shadow-2xl shadow-cyan-500/20">
                <h3 className="text-xl font-orbitron text-center text-slate-100">Complete Your Profile</h3>
                <p className="text-sm text-slate-300 text-center">We need a few more details before booking your appointment.</p>
                
                <div className="space-y-3">
                  <input type="text" placeholder="Full Name" value={profileModalData.name || ''} onChange={(e) => setProfileModalData({...profileModalData, name: e.target.value})} className={inputStyles} />
                  <input type="email" placeholder="Email Address" value={profileModalData.email || ''} onChange={(e) => setProfileModalData({...profileModalData, email: e.target.value})} className={inputStyles} />
                  <input type="text" placeholder="Date of Birth (YYYY-MM-DD)" value={profileModalData.dob || ''} onChange={(e) => setProfileModalData({...profileModalData, dob: e.target.value})} className={inputStyles} />
                </div>
                
                <div className="flex gap-4 pt-2">
                    <button onClick={() => { setIsProfileModalOpen(false); setStagedBooking(null); }} className="w-full neon-button-secondary rounded-md py-2">Cancel</button>
                    <button onClick={handleProfileModalSave} className="w-full neon-button rounded-md py-2">Save & Continue Booking</button>
                </div>
            </div>
        </div>
    )}

    </div>
  );
};

export default Scheduler;