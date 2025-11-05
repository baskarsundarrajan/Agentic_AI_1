import React, { useState } from 'react';
import { Medication } from '../types';
import { checkDrugInteractions } from '../services/geminiService';
import Loader from './shared/Loader';

interface MedicationManagerProps {
    medications: Medication[];
    addMedication: (medication: Omit<Medication, 'id'>) => void;
    deleteMedication: (medicationId: string) => Promise<void>;
}

const MedicationManager: React.FC<MedicationManagerProps> = ({ medications, addMedication, deleteMedication }) => {
    const [newMed, setNewMed] = useState({ name: '', dosage: '', frequency: '' });
    const [interactionResult, setInteractionResult] = useState('');
    const [isChecking, setIsChecking] = useState(false);

    const handleAddMedication = () => {
        if (!newMed.name || !newMed.dosage || !newMed.frequency) {
            alert("Please fill all medication fields.");
            return;
        }
        addMedication(newMed);
        setNewMed({ name: '', dosage: '', frequency: '' });
    };

    const handleInteractionCheck = async () => {
        setIsChecking(true);
        setInteractionResult('');
        try {
            const result = await checkDrugInteractions(medications.map(m => m.name));
            setInteractionResult(result);
        } catch (error) {
            console.error(error);
            setInteractionResult('An error occurred while checking for interactions.');
        } finally {
            setIsChecking(false);
        }
    };
    
    const inputStyles = "w-full p-2 bg-slate-800/70 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-400 text-slate-100 border border-slate-600 placeholder-slate-400";

    return (
        <div className="p-6 h-full overflow-y-auto text-slate-200">
            <h2 className="text-xl font-bold text-slate-100 mb-4 text-center">Medication & Adherence</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-lg font-semibold mb-2">Current Prescriptions</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {medications.length > 0 ? medications.map(med => (
                            <div key={med.id} className="p-3 bg-slate-800/50 rounded-md border border-slate-700 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-teal-300">{med.name}</p>
                                    <p className="text-sm text-slate-400">{med.dosage}, {med.frequency}</p>
                                </div>
                                <button
                                    onClick={() => deleteMedication(med.id)}
                                    className="text-xs bg-slate-700/90 text-slate-200 hover:bg-red-500/60 hover:text-white font-semibold px-3 py-1.5 rounded-full transition-all duration-200 transform hover:scale-105 border border-slate-600 hover:border-red-500/80"
                                >
                                    Remove
                                </button>
                            </div>
                        )) : <p className="text-slate-400 text-sm">No medications added.</p>}
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-semibold mb-2">Add New Medication</h3>
                    <div className="space-y-2">
                        <input type="text" placeholder="Medication Name" value={newMed.name} onChange={(e) => setNewMed({...newMed, name: e.target.value})} className={inputStyles} />
                        <input type="text" placeholder="Dosage (e.g., 50mg)" value={newMed.dosage} onChange={(e) => setNewMed({...newMed, dosage: e.target.value})} className={inputStyles} />
                        <input type="text" placeholder="Frequency (e.g., Once a day)" value={newMed.frequency} onChange={(e) => setNewMed({...newMed, frequency: e.target.value})} className={inputStyles} />
                        <button onClick={handleAddMedication} className="w-full neon-button-secondary rounded-md py-2 transition">Add Medication</button>
                    </div>
                </div>
            </div>
            <div className="mt-6 border-t border-cyan-300/20 pt-6">
                <h3 className="text-lg font-semibold mb-2">AI Drug Interaction Matrix</h3>
                <button
                    onClick={handleInteractionCheck}
                    disabled={isChecking || medications.length < 2}
                    className="neon-button rounded-md py-2 px-4 flex items-center justify-center"
                >
                    {isChecking ? <Loader /> : 'Initiate Cross-Check'}
                </button>
                {isChecking && (
                    <div className="mt-4 p-4 flex justify-center items-center bg-slate-800/50 rounded-lg border border-slate-700">
                        <Loader />
                        <p className="ml-4 text-slate-300 animate-pulse">Analyzing potential interactions...</p>
                    </div>
                )}
                {interactionResult && !isChecking && (
                    <div className="mt-4 p-4 bg-amber-500/20 rounded-lg whitespace-pre-wrap text-sm text-amber-200 border border-amber-400/50 critical-alert-pulse">
                        <p className="font-bold mb-2 text-amber-200">Interaction Matrix Report:</p>
                        {interactionResult}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MedicationManager;