import React, { useState, useEffect, useRef, useCallback } from 'react';
import { routeVoiceCommand, handleGeneralChat, generateSpeech, decode, decodeAudioData } from '../services/geminiService';
import { VoiceCommandResult, PatientProfile, Appointment, Medication } from '../types';
import Loader from './shared/Loader';
import { MicrophoneIcon, CloseIcon } from './shared/IconComponents';

// SpeechRecognition Types for Web Speech API
interface SpeechRecognitionResult {
    readonly [index: number]: SpeechRecognitionAlternative;
    readonly isFinal: boolean;
    readonly length: number;
}
interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
}
interface SpeechRecognitionResultList {
    readonly [index: number]: SpeechRecognitionResult;
    readonly length: number;
}
interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
}
interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onstart: () => void;
    onend: () => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    onresult: (event: SpeechRecognitionEvent) => void;
    start: () => void;
    stop: () => void;
}
interface SpeechRecognitionStatic {
    new(): SpeechRecognition;
}

interface VoiceAssistantProps {
    isOpen: boolean;
    onClose: () => void;
    requestAppointment: (specialty: string) => void;
    patientProfile: PatientProfile;
    appointments: Appointment[];
    medications: Medication[];
}

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'awaiting_confirmation';

interface ConversationTurn {
    speaker: 'user' | 'ai';
    text: string;
}

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ 
    isOpen, 
    onClose, 
    requestAppointment, 
    patientProfile,
    appointments,
    medications 
}) => {
    const [state, setState] = useState<VoiceState>('idle');
    const [conversation, setConversation] = useState<ConversationTurn[]>([]);
    const [confirmationData, setConfirmationData] = useState<{ specialty: string } | null>(null);

    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const conversationEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversation]);

    const stopAllAudio = () => {
        sourcesRef.current.forEach(source => source.stop());
        sourcesRef.current.clear();
    };

    const startListening = () => {
        if (recognitionRef.current && state !== 'listening') {
            recognitionRef.current.start();
        }
    };
    
    const playAudio = async (base64Audio: string) => {
        if (!audioContextRef.current || !base64Audio) return;

        stopAllAudio();

        try {
            const audioData = decode(base64Audio);
            const audioBuffer = await decodeAudioData(audioData, audioContextRef.current, 24000, 1);
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);

            source.onended = () => {
                sourcesRef.current.delete(source);
                if (state === 'awaiting_confirmation') {
                    startListening();
                } else if (state !== 'idle' && recognitionRef.current) {
                    setTimeout(() => {
                        startListening();
                    }, 500);
                }
            };
            source.start();
            sourcesRef.current.add(source);
        } catch (error) {
            console.error("Error playing audio:", error);
            startListening(); // Fallback
        }
    };

    const speak = async (text: string) => {
        setState('speaking');
        const audio = await generateSpeech(text);
        if (audio) {
            await playAudio(audio);
        } else {
            console.error("TTS failed");
            startListening(); // Fallback
        }
    };

    const handleTranscription = async (text: string) => {
        setState('processing');

        if (state === 'awaiting_confirmation' && confirmationData) {
            const affirmative = text.toLowerCase().includes('yes') || text.toLowerCase().includes('sure') || text.toLowerCase().includes('ok');
            if (affirmative) {
                requestAppointment(confirmationData.specialty);
                const response = `Okay, I'm opening the scheduler to find a ${confirmationData.specialty} for you.`;
                setConversation(prev => [...prev, { speaker: 'ai', text: response }]);
                await speak(response);
                setTimeout(onClose, 2500);
            } else {
                const response = "Alright. Is there anything else I can help you with?";
                 setConversation(prev => [...prev, { speaker: 'ai', text: response }]);
                await speak(response);
            }
            setConfirmationData(null);
            return;
        }

        const result: VoiceCommandResult = await routeVoiceCommand(text);
        let responseText = '';

        switch (result.intent) {
            case 'GENERAL_QUESTION':
                responseText = await handleGeneralChat(result.question || text);
                break;
            case 'BOOK_APPOINTMENT':
                if (result.specialty) {
                    responseText = `I can help with that. Should I look for an available ${result.specialty}? Please say yes or no.`;
                    setConfirmationData({ specialty: result.specialty });
                    setState('awaiting_confirmation');
                } else {
                    responseText = "I can help book an appointment, but I need to know the specialty. For example, say 'book an appointment with a cardiologist'.";
                }
                break;
            case 'GET_APPOINTMENTS':
                if (appointments.length === 0) {
                    responseText = "You have no upcoming appointments scheduled.";
                } else {
                    const appointmentList = appointments.map(app => `with Dr. ${app.doctor.name} for ${app.doctor.specialty} on ${app.day} at ${app.time}`).join('... and ');
                    responseText = `You have ${appointments.length} upcoming appointment${appointments.length > 1 ? 's' : ''}: ${appointmentList}.`;
                }
                break;
            case 'GET_MEDICATIONS':
                if (medications.length === 0) {
                    responseText = "You don't have any medications listed in your profile.";
                } else {
                    const medList = medications.map(med => `${med.name} ${med.dosage}, taken ${med.frequency}`).join(', ');
                    responseText = `You are currently taking: ${medList}.`;
                }
                break;
            case 'GET_PROFILE_INFO':
                const { name, dob, bloodType, allergies } = patientProfile;
                responseText = `Here's a summary of your profile. Your name is ${name || 'not set'}. Your date of birth is ${dob || 'not set'}. `;
                if (bloodType) responseText += `Your blood type is ${bloodType}. `;
                if (allergies) responseText += `You have listed allergies to ${allergies}.`;
                else responseText += `You have no listed allergies.`;
                break;
            case 'END_CONVERSATION':
                responseText = "Goodbye! Take care.";
                setTimeout(onClose, 2000);
                break;
            default:
                responseText = "I'm sorry, I didn't understand that. Could you please rephrase?";
                break;
        }
        
        setConversation(prev => [...prev, { speaker: 'ai', text: responseText }]);
        await speak(responseText);
    };

    const handleClose = useCallback(() => {
        stopAllAudio();
        recognitionRef.current?.stop();
        setState('idle');
        setConversation([]);
        onClose();
    }, [onClose]);
    
    useEffect(() => {
        interface CustomWindow extends Window {
            SpeechRecognition: SpeechRecognitionStatic;
            webkitSpeechRecognition: SpeechRecognitionStatic;
            webkitAudioContext: typeof AudioContext;
        }
        const SpeechRecognitionAPI = (window as unknown as CustomWindow).SpeechRecognition || (window as unknown as CustomWindow).webkitSpeechRecognition;
        if (SpeechRecognitionAPI) {
            const recognition = new SpeechRecognitionAPI();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onstart = () => setState('listening');
            recognition.onresult = (event: SpeechRecognitionEvent) => {
                const finalTranscript = event.results[0][0].transcript.trim();
                if (finalTranscript) {
                    setConversation(prev => [...prev, { speaker: 'user', text: finalTranscript }]);
                    handleTranscription(finalTranscript);
                }
            };
            recognition.onend = () => {
                if (state === 'listening') setState('idle');
            };
            recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                console.error('Speech recognition error:', event.error);
                setState('idle');
            };
            recognitionRef.current = recognition;
        }

        return () => {
            recognitionRef.current?.stop();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (isOpen) {
             if (!audioContextRef.current) {
                interface CustomWindow extends Window { webkitAudioContext: typeof AudioContext; }
                audioContextRef.current = new (window.AudioContext || (window as unknown as CustomWindow).webkitAudioContext)({ sampleRate: 24000 });
            }
            const greeting = "Hello! How can I help you today?";
            setConversation([{ speaker: 'ai', text: greeting }]);
            speak(greeting);
        } else if (state !== 'idle') {
            handleClose();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="glassmorphic-card p-6 rounded-2xl w-full max-w-lg space-y-4 border-2 border-teal-400/50 shadow-2xl shadow-cyan-500/20 relative min-h-[400px] max-h-[90vh] flex flex-col">
                <div className="flex-shrink-0">
                    <h3 className="text-xl font-orbitron text-center text-slate-100">AI Voice Assistant</h3>
                    <button onClick={handleClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                        <CloseIcon />
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto pr-2 space-y-3">
                    {conversation.map((turn, index) => (
                        <div key={index} className={`flex items-end gap-2 ${turn.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`px-3 py-2 rounded-2xl max-w-[85%] text-sm break-words ${
                                turn.speaker === 'user' 
                                ? 'bg-blue-500/50 text-white rounded-br-none' 
                                : 'bg-slate-700/50 text-slate-200 rounded-bl-none'
                            }`}>
                                {turn.text}
                            </div>
                        </div>
                    ))}
                    {state === 'processing' && (
                        <div className="flex justify-start">
                             <div className="px-3 py-2 rounded-lg bg-slate-700/50">
                                <Loader />
                            </div>
                        </div>
                    )}
                    <div ref={conversationEndRef} />
                </div>
                
                <div className="flex-shrink-0 flex flex-col items-center justify-center pt-4">
                     <p className="text-xs text-slate-400 h-4 mb-2">
                        {state === 'listening' ? 'Listening...' : state === 'speaking' ? 'Speaking...' : 'Ready'}
                    </p>
                    <button 
                        onClick={state === 'listening' ? () => recognitionRef.current?.stop() : startListening}
                        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300
                        ${state === 'listening' ? 'bg-red-500/80 animate-pulse-glow scale-110' : 'bg-cyan-500/80 hover:bg-cyan-500'}`}>
                        <MicrophoneIcon />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VoiceAssistant;
