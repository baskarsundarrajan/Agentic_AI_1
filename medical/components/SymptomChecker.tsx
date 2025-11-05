
import React, { useState, useRef, useEffect } from 'react';
import { Message, MessageAction, View, PatientProfile, AgentState } from '../types';
import { runSymptomTriageGraph, extractInfoFromReport, extractProfileDetailsFromText, routeUserIntent, handleGeneralChat } from '../services/geminiService';
import Loader from './shared/Loader';
import { BotIcon, PaperclipIcon, SendIcon, UserIcon, MicrophoneIcon } from './shared/IconComponents';

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

interface SymptomCheckerProps {
  setActiveView: (view: View) => void;
  requestAppointment: (specialty: string) => void;
  updatePatientProfile: (updates: Partial<PatientProfile>) => void;
  onSaveProfile: (updatedProfile: PatientProfile) => Promise<void>;
  patientProfile: PatientProfile;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setAgentStates: React.Dispatch<React.SetStateAction<AgentState[]>>;
  initialAgentStates: AgentState[];
}

const SymptomChecker: React.FC<SymptomCheckerProps> = ({ setActiveView, requestAppointment, updatePatientProfile, onSaveProfile, patientProfile, messages, setMessages, setAgentStates, initialAgentStates }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAwaitingProfileDetails, setIsAwaitingProfileDetails] = useState(false);
  const [stagedTriageResult, setStagedTriageResult] = useState<{ text: string; specialty: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isListening, setIsListening] = useState(false);
  const [isMicSupported, setIsMicSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);
  
  useEffect(() => {
    interface CustomWindow extends Window {
        SpeechRecognition: SpeechRecognitionStatic;
        webkitSpeechRecognition: SpeechRecognitionStatic;
    }
    const SpeechRecognition = (window as unknown as CustomWindow).SpeechRecognition || (window as unknown as CustomWindow).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        console.warn("Speech Recognition API not supported in this browser.");
        setIsMicSupported(false);
        return;
    }
    
    setIsMicSupported(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            alert("Microphone access was denied. Please allow microphone access in your browser settings to use this feature.");
        }
        setIsListening(false);
    };
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(prevInput => (prevInput ? prevInput + ' ' : '') + transcript);
    };

    recognitionRef.current = recognition;

    return () => {
        recognitionRef.current?.stop();
    };
  }, []);
  
  const updateAgentState = (id: string, updates: Partial<Omit<AgentState, 'id' | 'name'>>) => {
      setAgentStates(prevStates => 
          prevStates.map(agent => 
              agent.id === id ? { ...agent, ...updates } : agent
          )
      );
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));


  const handleSend = async () => {
    if (input.trim() === '' || isLoading) return;

    const userMessage: Message = { sender: 'user', text: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    if (isAwaitingProfileDetails && stagedTriageResult) {
        try {
            const extractedDetails = await extractProfileDetailsFromText(userMessage.text);
            const updatedProfile = { ...patientProfile, ...extractedDetails };
            
            updatePatientProfile(updatedProfile); 
            await onSaveProfile(updatedProfile); 

            const actions: MessageAction[] = [
                { text: `Find a ${stagedTriageResult.specialty}`, style: 'primary', onClick: () => requestAppointment(stagedTriageResult.specialty) },
                { text: 'No, thanks', style: 'secondary', onClick: () => {} },
            ];
            const finalAiMessage: Message = { sender: 'ai', text: `${stagedTriageResult.text}\n\nWould you like me to help you find a specialist?`, actions };
            
            setMessages(prev => [...prev, finalAiMessage]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { sender: 'ai', text: 'Sorry, I had trouble processing that. Please try again.' }]);
        } finally {
            setIsLoading(false);
            setIsAwaitingProfileDetails(false);
            setStagedTriageResult(null);
        }
        return;
    }
    
    setAgentStates(initialAgentStates);
    await sleep(100);
    
    updateAgentState('intentRouter', { status: 'active', thought: 'Analyzing user input to classify intent...' });

    try {
        const intent = await routeUserIntent(newMessages);
        
        updateAgentState('intentRouter', { status: 'done', thought: `Intent classified as: ${intent === 'MEDICAL_SYMPTOM' ? 'Medical Symptom' : 'General Chat'}` });
        await sleep(300);

        if (intent === 'GENERAL_CHAT') {
            updateAgentState('triageRouter', { status: 'idle', thought: 'Not a medical query.' });
            updateAgentState('clarificationAgent', { status: 'idle', thought: 'Not a medical query.' });
            updateAgentState('triageAgent', { status: 'idle', thought: 'Not a medical query.' });

            const aiResponseText = await handleGeneralChat(newMessages);
            const aiMessage: Message = { sender: 'ai', text: aiResponseText };
            setMessages(prev => [...prev, aiMessage]);
        } else { // MEDICAL_SYMPTOM
            updateAgentState('triageRouter', { status: 'active', thought: 'Routing symptom query... Deciding if more information is needed.' });

            const triageResult = await runSymptomTriageGraph(newMessages);

            updateAgentState('triageRouter', { status: 'done', thought: `Decision made: ${triageResult.decision}` });
            await sleep(300);
            
            let finalAiMessage: Message;

            if (triageResult.decision === 'TRIAGE' && triageResult.specialty) {
                updateAgentState('clarificationAgent', { status: 'skipped', thought: 'Sufficient information found.' });
                await sleep(300);
                updateAgentState('triageAgent', { status: 'active', thought: 'Analyzing all information to formulate a final care recommendation...' });
                await sleep(500);
                const recommendation = triageResult.text.split('\n')[0].replace(/:$/, '');
                updateAgentState('triageAgent', { status: 'done', thought: `Recommendation generated: ${recommendation}` });

                const isProfileComplete = patientProfile.name && patientProfile.email && patientProfile.dob;
                if (isProfileComplete) {
                    const actions: MessageAction[] = [
                        { text: `Find a ${triageResult.specialty}`, style: 'primary', onClick: () => requestAppointment(triageResult.specialty) },
                        { text: 'No, thanks', style: 'secondary', onClick: () => {} },
                    ];
                    finalAiMessage = { sender: 'ai', text: `${triageResult.text}\n\nWould you like me to help you find a specialist?`, actions };
                } else {
                    setStagedTriageResult({ text: triageResult.text, specialty: triageResult.specialty });
                    setIsAwaitingProfileDetails(true);
                    finalAiMessage = { sender: 'ai', text: "Before I can help you book an appointment, I need a bit more information to complete your profile.\n\nCould you please provide your full name, email address, and date of birth?" };
                }
            } else { // CLARIFY
                updateAgentState('clarificationAgent', { status: 'active', thought: 'Formulating a critical clarifying question...' });
                updateAgentState('triageAgent', { status: 'skipped', thought: 'Skipped. Awaiting more info.' });
                await sleep(500);
                updateAgentState('clarificationAgent', { status: 'done', thought: 'Question generated to gather more details.' });

                finalAiMessage = { sender: 'ai', text: triageResult.text };
            }
            
            setMessages(prev => [...prev, finalAiMessage]);
        }
    } catch (error) {
        console.error("Error in handleSend:", error);
        setAgentStates(prev => prev.map(a => ({ ...a, status: a.status === 'active' ? 'error' : a.status, thought: a.status === 'active' ? 'An error occurred.' : a.thought })));
        setMessages(prev => [...prev, { sender: 'ai', text: 'Sorry, an unexpected error occurred. Please try again.' }]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || isLoading) return;

    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file (e.g., JPG, PNG).');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const imageDataUrl = e.target?.result as string;
        if (imageDataUrl) {
            const userMessage: Message = { sender: 'user', text: `Uploaded ${file.name}`, image: imageDataUrl };
            const newMessages = [...messages, userMessage];
            setMessages(newMessages);
            analyzeReport(imageDataUrl, newMessages);
        }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };
  
  const analyzeReport = async (imageDataUrl: string, currentMessages: Message[]) => {
    setIsLoading(true);
    try {
        const [meta, base64Data] = imageDataUrl.split(',');
        const mimeType = meta.match(/:(.*?);/)?.[1];
        if (!mimeType || !base64Data) {
            throw new Error("Invalid image data URL.");
        }

        const extractedData = await extractInfoFromReport({ mimeType, data: base64Data });
        
        if (extractedData.patientProfile) {
            const profileUpdates = Object.fromEntries(
                Object.entries(extractedData.patientProfile).filter(([, value]) => value)
            );
            
            if (Object.keys(profileUpdates).length > 0) {
                updatePatientProfile(profileUpdates);
            }
        }
        
        let responseMessage: Message;
        const { summary, specialty, bookAppointment } = extractedData;

        if (bookAppointment) {
            const actions: MessageAction[] = [
                { 
                    text: 'Yes, find a doctor', 
                    style: 'primary', 
                    onClick: () => specialty ? requestAppointment(specialty) : setActiveView('scheduler') 
                },
                { text: 'No, thanks', style: 'secondary', onClick: () => {} },
            ];
            responseMessage = { sender: 'ai', text: `${summary}\n\nWould you like to book an appointment with a ${specialty || 'specialist'}?`, actions };
        } else {
            responseMessage = { sender: 'ai', text: summary };
        }
        setMessages([...currentMessages, responseMessage]);
    } catch (error) {
        console.error(error);
        setMessages([...currentMessages, { sender: 'ai', text: 'Sorry, I had trouble analyzing the report. Please try again.' }]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleMicClick = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
        recognitionRef.current.stop();
    } else {
        recognitionRef.current.start();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden text-slate-200">
        <div className="p-4 border-b border-cyan-300/20">
            <h2 className="text-xl font-bold text-slate-100 text-center">AI Symptom Checker & Triage</h2>
            <p className="text-sm text-slate-400 text-center">Describe your symptoms or upload a report to get a care recommendation.</p>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-4">
            {messages.map((msg, index) => (
                <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                {msg.sender === 'ai' && (
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-[0_0_10px_rgba(100,255,218,0.5)]">
                    <BotIcon />
                    </div>
                )}
                <div className={`max-w-md p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-blue-500/50 text-white rounded-br-none border border-blue-400' : 'bg-slate-700/50 text-slate-200 rounded-bl-none border border-slate-600'}`}>
                    <p className="text-sm whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></p>
                    {msg.image && (
                        <div className="mt-2">
                            <img src={msg.image} alt="Uploaded content" className="rounded-lg max-w-xs max-h-48 border-2 border-cyan-400/50" />
                        </div>
                    )}
                    {msg.actions && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {msg.actions.map((action, i) => (
                                <button key={i} onClick={action.onClick} className={`px-3 py-1.5 text-xs font-medium rounded-full transform hover:scale-105 ${
                                    action.style === 'primary' 
                                    ? 'neon-button' 
                                    : 'neon-button-secondary'
                                }`}>
                                    {action.text}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                {msg.sender === 'user' && (
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center">
                    <UserIcon />
                    </div>
                )}
                </div>
            ))}
            {isLoading && (
                <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                    <BotIcon />
                </div>
                <div className="max-w-md p-3 rounded-2xl bg-slate-700/50 text-slate-200 rounded-bl-none">
                    <Loader />
                </div>
                </div>
            )}
            <div ref={messagesEndRef} />
            </div>
        </div>
        <div className="p-4 border-t border-cyan-300/20 bg-slate-900/50">
            <div className="relative neon-glow-focus rounded-full">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isListening ? "Listening..." : "Describe symptoms or upload report..."}
                className={`w-full py-3 pl-12 ${isMicSupported ? 'pr-24' : 'pr-12'} text-sm text-slate-100 bg-slate-800/70 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-400`}
                disabled={isLoading}
            />
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
            <button
                onClick={handleFileSelect}
                disabled={isLoading}
                className="absolute inset-y-0 left-0 flex items-center justify-center w-12 h-full text-slate-400 hover:text-teal-300 disabled:text-slate-600 transition-colors"
            >
                <PaperclipIcon />
            </button>
            {isMicSupported && (
                 <button
                    onClick={handleMicClick}
                    disabled={isLoading}
                    className={`absolute inset-y-0 right-12 flex items-center justify-center w-12 h-full transition-colors disabled:text-slate-600 ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-400 hover:text-teal-300'}`}
                    title={isListening ? 'Stop listening' : 'Start listening'}
                >
                    <MicrophoneIcon />
                </button>
            )}
            <button
                onClick={handleSend}
                disabled={isLoading || !input}
                className="absolute inset-y-0 right-0 flex items-center justify-center w-12 h-full text-teal-300 hover:text-white disabled:text-slate-600 transition-colors"
            >
                <SendIcon />
            </button>
            </div>
        </div>
    </div>
  );
};

export default SymptomChecker;
