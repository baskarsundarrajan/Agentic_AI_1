import React, { useState, useEffect } from 'react';
import { PatientProfile as PatientProfileType } from '../types';
import { summarizeDocument } from '../services/geminiService';
import Loader from './shared/Loader';

interface PatientProfileProps {
    profile: PatientProfileType;
    onSave: (updatedProfile: PatientProfileType) => Promise<void>;
}

const PatientProfile: React.FC<PatientProfileProps> = ({ profile, onSave }) => {
  const [localProfile, setLocalProfile] = useState<PatientProfileType>(profile);
  const [medicalDocs, setMedicalDocs] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalProfile(profile);
  }, [profile]);

  const handleSummarize = async () => {
    if (!medicalDocs) return;
    setIsSummarizing(true);
    try {
        const summary = await summarizeDocument(medicalDocs);
        setLocalProfile({ ...localProfile, medicalHistorySummary: summary });
    } catch (error) {
        console.error(error);
    } finally {
        setIsSummarizing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setLocalProfile(prev => ({ ...prev, [name]: value }));
  }
  
  const handleSave = async () => {
    setIsSaving(true);
    await onSave(localProfile);
    setIsSaving(false);
    alert('Profile saved successfully!');
  };
  
  const inputStyles = "w-full p-2 bg-slate-800/70 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-400 text-slate-100 border border-slate-600 placeholder-slate-400";

  return (
    <div className="p-6 h-full overflow-y-auto text-slate-200">
      <h2 className="text-xl font-bold text-slate-100 mb-4 text-center">Patient Onboarding & Data</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Patient Information</h3>
          <div className="space-y-3">
            <input type="text" name="name" placeholder="Full Name" value={localProfile.name} onChange={handleInputChange} className={inputStyles} />
            <input type="email" name="email" placeholder="Email Address" value={localProfile.email} onChange={handleInputChange} className={inputStyles} />
            <input type="text" name="dob" placeholder="Date of Birth (YYYY-MM-DD)" value={localProfile.dob} onChange={handleInputChange} className={inputStyles} />
            <input type="text" name="bloodType" placeholder="Blood Type" value={localProfile.bloodType} onChange={handleInputChange} className={inputStyles} />
            <textarea name="allergies" placeholder="Allergies (comma-separated)" value={localProfile.allergies} onChange={handleInputChange} className={`${inputStyles} h-24`} />
          </div>
           <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full mt-4 neon-button-secondary rounded-md py-2 flex items-center justify-center disabled:opacity-50"
            >
                {isSaving ? <Loader /> : 'Save Profile Changes'}
            </button>
        </div>
        <div>
            <h3 className="text-lg font-semibold mb-2">Upload Medical Documents</h3>
            <p className="text-xs text-slate-400 mb-2">For demo purposes, paste the text from your medical documents below.</p>
            <textarea
                placeholder="Paste medical history text here..."
                className={`${inputStyles} h-36`}
                value={medicalDocs}
                onChange={(e) => setMedicalDocs(e.target.value)}
            />
            <button
                onClick={handleSummarize}
                disabled={isSummarizing || !medicalDocs}
                className="w-full mt-2 neon-button rounded-md py-2 flex items-center justify-center"
            >
                {isSummarizing ? <Loader /> : 'Initiate Summary Protocol'}
            </button>
        </div>
      </div>
      <div className="mt-6 border-t border-cyan-300/20 pt-6">
        <h3 className="text-lg font-semibold mb-2">AI-Generated Medical Summary</h3>
        <div className="p-4 bg-slate-800/50 rounded-lg whitespace-pre-wrap text-sm text-slate-300 min-h-[100px] border border-slate-700">
            {localProfile.medicalHistorySummary || "Summary will appear here after processing documents."}
        </div>
      </div>
    </div>
  );
};

export default PatientProfile;