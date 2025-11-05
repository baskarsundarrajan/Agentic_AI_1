import React, { useState, useRef } from 'react';
import { Consultation } from '../types';
import { analyzeConsultationNotes } from '../services/geminiService';
import Loader from './shared/Loader';
import { PaperclipIcon } from './shared/IconComponents';

interface ConsultationAnalyzerProps {
    consultations: Consultation[];
    addConsultation: (consultation: Omit<Consultation, 'id'>) => void;
}

const ConsultationAnalyzer: React.FC<ConsultationAnalyzerProps> = ({ consultations, addConsultation }) => {
    const [doctorName, setDoctorName] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = () => {
        fileInputRef.current?.click();
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || isAnalyzing) return;

        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file (e.g., JPG, PNG).');
            return;
        }

        if (!doctorName) {
            alert("Please provide the doctor's name before uploading notes.");
            event.target.value = ''; // Reset file input
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const imageDataUrl = e.target?.result as string;
            if (imageDataUrl) {
                analyzeImage(imageDataUrl, file.name);
            }
        };
        reader.readAsDataURL(file);
        event.target.value = ''; // Reset file input
    };
    
    const analyzeImage = async (imageDataUrl: string, fileName: string) => {
        setIsAnalyzing(true);
        try {
            const [meta, base64Data] = imageDataUrl.split(',');
            const mimeType = meta.match(/:(.*?);/)?.[1];
            if (!mimeType || !base64Data) {
                throw new Error("Invalid image data URL.");
            }

            const { summary, actionItems } = await analyzeConsultationNotes({ mimeType, data: base64Data });
            const newConsultation: Omit<Consultation, 'id'> = {
                date: new Date().toLocaleDateString(),
                doctorName,
                notes: `Analyzed from uploaded image: ${fileName}`,
                summary,
                actionItems
            };
            addConsultation(newConsultation);
            setDoctorName('');
        } catch (error) {
            console.error(error);
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    return (
        <div className="p-6 h-full overflow-y-auto flex flex-col md:flex-row gap-6 text-slate-200">
            <div className="md:w-1/3 flex flex-col">
                 <h2 className="text-xl font-bold text-slate-100 mb-4">Post-Consultation Automation</h2>
                 <h3 className="text-lg font-semibold mb-2">Add New Consultation</h3>
                 <div className="space-y-3">
                    <input type="text" placeholder="Doctor's Name" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} className="w-full p-2 bg-slate-800/70 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-400 text-slate-100 border border-slate-600" />
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                    <button
                        onClick={handleFileSelect}
                        disabled={isAnalyzing || !doctorName}
                        className="w-full neon-button rounded-md py-2 flex justify-center items-center"
                    >
                        {isAnalyzing ? <Loader /> : (
                            <div className="flex items-center">
                                <PaperclipIcon />
                                <span className="ml-2">Upload & Analyze Notes</span>
                            </div>
                        )}
                    </button>
                </div>
                <h3 className="text-lg font-semibold mt-6 mb-2">Past Consultations</h3>
                <div className="space-y-2 overflow-y-auto flex-1">
                    {consultations.map(c => (
                        <div key={c.id} onClick={() => setSelectedConsultation(c)} className={`cursor-pointer p-2 rounded-md transition-all duration-200 border ${selectedConsultation?.id === c.id ? 'bg-cyan-400/20 border-cyan-400' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50'}`}>
                           <p className="font-semibold">{c.date} - Dr. {c.doctorName}</p>
                        </div>
                    ))}
                     {consultations.length === 0 && <p className="text-slate-400 text-sm">No past consultations found.</p>}
                </div>
            </div>
            <div className="md:w-2/3 border-t md:border-t-0 md:border-l border-cyan-300/20 pt-6 md:pt-0 md:pl-6">
                 <h2 className="text-xl font-bold text-slate-100 mb-4">Consultation Details</h2>
                 {selectedConsultation ? (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-teal-300">{selectedConsultation.date} with Dr. {selectedConsultation.doctorName}</h3>
                        <div>
                            <h4 className="font-bold text-slate-100">AI Summary</h4>
                            <p className="p-3 bg-slate-800/50 border border-slate-700 rounded-md text-sm">{selectedConsultation.summary}</p>
                        </div>
                         <div>
                            <h4 className="font-bold text-slate-100">Patient Action Items</h4>
                            <ul className="p-3 bg-green-500/20 border border-green-500/50 rounded-md text-sm list-disc list-inside space-y-1">
                                {selectedConsultation.actionItems.length > 0 ? selectedConsultation.actionItems.map((item, i) => (
                                    <li key={i}>{item}</li>
                                )) : <li>No specific action items were identified.</li>}
                            </ul>
                        </div>
                    </div>
                 ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-slate-400 text-center">Select a past consultation to view details.</p>
                    </div>
                 )}
            </div>
        </div>
    );
};

export default ConsultationAnalyzer;