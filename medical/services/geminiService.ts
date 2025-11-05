import { GoogleGenAI, GenerateContentResponse, Type, Modality } from "@google/genai";
import { Message, ExtractedReportData, ExtractedPatientProfile, VoiceCommandResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = "gemini-2.5-flash";

// --- Audio Helper Functions ---
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


const formatHistoryForPrompt = (history: Message[]): string => {
  return history.map(msg => `${msg.sender === 'user' ? 'Patient' : 'Assistant'}: ${msg.text}`).join('\n');
};

const generateText = async (prompt: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Gemini API error in generateText:", error);
        return "Sorry, I'm having trouble processing your request. Please try again later.";
    }
}

export type UserIntent = 'MEDICAL_SYMPTOM' | 'GENERAL_CHAT';

export const routeUserIntent = async (history: Message[]): Promise<UserIntent> => {
    const historyText = formatHistoryForPrompt(history);
    // FIX: Replaced `findLast` with a compatible alternative to support older TypeScript compiler targets.
    const lastUserMessage = history.slice().reverse().find(m => m.sender === 'user')?.text || '';

    const prompt = `You are an intent classification router for an AI Medical Assistant. Your task is to determine if the user's latest message is describing a medical symptom for triage or if it's a general question.

    - **MEDICAL_SYMPTOM**: The user is describing personal physical or mental feelings, pain, illness, conditions (e.g., "I have a headache and fever", "my stomach hurts", "I've been feeling anxious").
    - **GENERAL_CHAT**: The user is asking for general information, advice, or facts not related to their current personal symptoms (e.g., "what is a good diet?", "how does ibuprofen work?", "tell me about diabetes").

    Conversation History:
    ---
    ${historyText}
    ---

    Based on the last user message ("${lastUserMessage}"), classify the intent. Respond with ONLY 'MEDICAL_SYMPTOM' or 'GENERAL_CHAT'.`;
    
    const result = await generateText(prompt);
    if (result.toUpperCase().includes('GENERAL_CHAT')) {
        return 'GENERAL_CHAT';
    }
    return 'MEDICAL_SYMPTOM';
};

export const handleGeneralChat = async (history: Message[] | string): Promise<string> => {
    const historyText = Array.isArray(history) ? formatHistoryForPrompt(history) : history;
    const prompt = `You are a helpful and friendly AI Medical Assistant. The user has asked a general question. Provide a helpful and informative response based on the conversation history.

    IMPORTANT: Always include the following disclaimer at the end of your response, on a new line:
    "Disclaimer: I am an AI assistant. This information is for educational purposes only and is not a substitute for professional medical advice. Always consult with a qualified healthcare provider."

    Conversation history:
    ---
    ${historyText}
    ---

    Your helpful response:`;
    return await generateText(prompt);
};


// --- LangGraph Simulation for Symptom Triage ---

export interface TriageResult {
  decision: 'TRIAGE' | 'CLARIFY';
  text: string;
  specialty?: string;
}

// LangGraph Simulation: Node 1 (Router)
const routeSymptomQuery = async (historyText: string, assistantTurns: number): Promise<'TRIAGE' | 'CLARIFY'> => {
    const prompt = `You are an expert medical triage router. Your job is to analyze a conversation and decide if there is enough information to provide a recommendation for a level of care.
The conversation is between a patient and an AI assistant. The assistant has already asked ${assistantTurns} clarifying question(s).

Conversation:
---
${historyText}
---

Your goal is to reach a recommendation within 2-3 total questions.
- If you have enough information to make a recommendation, respond with ONLY the word 'TRIAGE'.
- If the assistant has already asked 2 or more questions, you should strongly prefer to 'TRIAGE' unless critical information is missing (e.g., duration of a severe symptom, presence of fever with a rash).
- Otherwise, if you absolutely need more information to make a safe recommendation, respond with ONLY the word 'CLARIFY'.`;
    
    const result = await generateText(prompt);
    // Be robust with the model's output
    if (result.toUpperCase().includes('TRIAGE')) return 'TRIAGE';
    return 'CLARIFY';
};

// LangGraph Simulation: Node 2a (Clarification Agent)
const askClarifyingQuestion = async (historyText: string): Promise<string> => {
    const prompt = `You are a helpful medical assistant trying to reach a diagnosis recommendation quickly. Based on the conversation so far, ask the MOST CRITICAL clarifying question to help you make a decision.
Your question should be targeted to narrow down the possibilities significantly. Avoid generic questions like "anything else?". Be direct and concise. Ask only one question.

Conversation:
---
${historyText}
---

Your single, critical clarifying question:`;
    return await generateText(prompt);
};

// LangGraph Simulation: Node 2b (Triage Agent)
const provideTriageRecommendation = async (historyText: string): Promise<string> => {
    const prompt = `You are a helpful medical assistant. Based on the detailed conversation with a patient, your task is to provide a final care recommendation.

Conversation:
---
${historyText}
---

Your response must strictly follow this structure:
1.  A clear recommendation. It MUST be one of these three options: 'Self-care', 'Telehealth Consultation', or 'Urgent Care'.
2.  A brief, easy-to-understand explanation for your recommendation based on the symptoms provided.
3.  A clear disclaimer: "Please remember, this is not a medical diagnosis. Consult with a qualified healthcare professional for any medical advice."

After the disclaimer, add a new line with the following exact format:
SPECIALTY: [The most relevant specialty, e.g., Cardiology, Dermatology, General Physician]

Do not provide a medical diagnosis or prescribe medication.`;
    return await generateText(prompt);
};

export const runSymptomTriageGraph = async (history: Message[]): Promise<TriageResult> => {
    // This function orchestrates the graph logic.
    const historyText = formatHistoryForPrompt(history);
    // The initial AI message is a greeting, not a question. So we subtract it from the count.
    const assistantTurns = history.filter(msg => msg.sender === 'ai').length - 1;
    const route = await routeSymptomQuery(historyText, assistantTurns);

    console.log(`[LangGraph Simulation] Route: ${route}, Turns: ${assistantTurns}`);

    if (route === 'TRIAGE') {
        const fullResponse = await provideTriageRecommendation(historyText);
        const specialtyMatch = fullResponse.match(/SPECIALTY:\s*(.*)/);
        const specialty = specialtyMatch ? specialtyMatch[1].trim() : undefined;
        const text = fullResponse.replace(/SPECIALTY:\s*(.*)/, '').trim();

        return { decision: 'TRIAGE', text, specialty };
    } else {
        const text = await askClarifyingQuestion(historyText);
        return { decision: 'CLARIFY', text };
    }
};

export const extractInfoFromReport = async (imageData: { mimeType: string; data: string }): Promise<ExtractedReportData> => {
  const imagePart = {
    inlineData: {
      mimeType: imageData.mimeType,
      data: imageData.data,
    },
  };

  const textPart = {
    text: `Analyze the attached medical report image. Extract the key medical summary and any patient profile information you can find, including patient name, date of birth, blood type, and known allergies.`,
  };

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "A concise summary of the report including Doctor's Name, Key Symptoms/Diagnosis, Prescribed Medications, and Follow-up recommendations. Use bullet points with \\n for newlines."
            },
            specialty: {
              type: Type.STRING,
              description: "The single most relevant medical specialty for a follow-up (e.g., Cardiology, Dermatology)."
            },
            bookAppointment: {
              type: Type.BOOLEAN,
              description: "Set to true if a follow-up is recommended or makes sense based on the report."
            },
            patientProfile: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Patient's Full Name (if available). If not found, return an empty string." },
                dob: { type: Type.STRING, description: "Patient's Date of Birth (if available). Format as YYYY-MM-DD if possible. If not found, return an empty string." },
                email: { type: Type.STRING, description: "Patient's email address (if available). If not found, return an empty string." },
                bloodType: { type: Type.STRING, description: "Patient's Blood Type, e.g., 'O+', 'A-'. (if available). If not found, return an empty string." },
                allergies: { type: Type.STRING, description: "A comma-separated list of the patient's known allergies (if available). If not found, return an empty string." },
              },
            }
          },
          required: ["summary", "specialty", "bookAppointment", "patientProfile"]
        }
      }
    });

    const jsonStr = response.text.trim();
    return JSON.parse(jsonStr);

  } catch (error) {
    console.error("Gemini API error in extractInfoFromReport:", error);
    return {
        summary: "Sorry, I couldn't read the medical report. Please ensure it's a clear image.",
        specialty: "",
        bookAppointment: false,
        patientProfile: {},
    };
  }
};

export const extractProfileDetailsFromText = async (text: string): Promise<Partial<ExtractedPatientProfile>> => {
  const prompt = `From the following text, extract the user's full name, email address, and date of birth.
  Text: "${text}"`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "The user's full name. If not found, return an empty string." },
            dob: { type: Type.STRING, description: "The user's date of birth. If possible, format as YYYY-MM-DD. If not found, return an empty string." },
            email: { type: Type.STRING, description: "The user's email address. If not found, return an empty string." },
          },
        }
      }
    });

    const jsonStr = response.text.trim();
    const parsed = JSON.parse(jsonStr);
    return Object.fromEntries(Object.entries(parsed).filter(([, value]) => value));
  } catch (error) {
    console.error("Gemini API error in extractProfileDetailsFromText:", error);
    return {};
  }
};


export const summarizeDocument = async (text: string): Promise<string> => {
  const prompt = `Summarize the following medical document. Extract key information such as diagnosed conditions, major surgeries, allergies, and current medications into a clear, concise summary. Use bullet points for lists. Medical document: "${text}"`;
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API error in summarizeDocument:", error);
    return "Could not summarize document.";
  }
};

export const checkDrugInteractions = async (meds: string[]): Promise<string> => {
  if (meds.length < 2) return "Please provide at least two medications to check for interactions.";
  
  const prompt = `You are an AI pharmacological assistant. Your task is to provide a drug interaction report for the following medications: ${meds.join(', ')}.
Use the provided real-time search information to:
1.  Identify any moderate to severe drug interactions.
2.  For each interaction found, briefly explain the risk in easy-to-understand terms.
3.  If no significant interactions are found, state this clearly.

Please format your response clearly.`;

   try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{googleSearch: {}}],
      },
    });

    let resultText = response.text;
    
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks && groundingChunks.length > 0) {
        const sources = new Set<string>();
        groundingChunks.forEach((chunk: any) => {
            if (chunk.web && chunk.web.uri) {
                const title = chunk.web.title || chunk.web.uri;
                sources.add(`* [${title}](${chunk.web.uri})`);
            }
        });
            
        if (sources.size > 0) {
            resultText += `\n\n---\n**Sources:**\n${[...sources].join('\n')}`;
        }
    }

    return resultText;

  } catch (error) {
    console.error("Gemini API error in checkDrugInteractions:", error);
    return "Could not check for drug interactions at this time.";
  }
};

export const analyzeConsultationNotes = async (imageData: { mimeType: string; data: string }): Promise<{ summary: string; actionItems: string[] }> => {
  const imagePart = {
    inlineData: {
      mimeType: imageData.mimeType,
      data: imageData.data,
    },
  };

  const textPart = {
    text: `You are an AI Scribe. Analyze the attached doctor's consultation notes image. First, provide a concise summary of the consultation. Second, extract all patient action items into a list. If there are no clear action items, return an empty list for actionItems.`,
  };

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "A concise summary of the consultation from the notes."
            },
            actionItems: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING
              },
              description: "A list of patient action items extracted from the notes. Return an empty array if none are found."
            }
          },
          required: ["summary", "actionItems"]
        }
      }
    });

    const jsonStr = response.text.trim();
    return JSON.parse(jsonStr);

  } catch (error) {
    console.error("Gemini API error in analyzeConsultationNotes:", error);
    return { summary: "Could not analyze the consultation notes from the image.", actionItems: [] };
  }
};

export const getHealthInsight = async (diaryEntry: string): Promise<string> => {
    const prompt = `Based on the following patient diary entry, provide a short, personalized health tip and a motivational message. The tone should be supportive and encouraging. Diary entry: "${diaryEntry}"`;
     try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model,
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Gemini API error in getHealthInsight:", error);
        return "Could not generate a health insight at this moment.";
    }
};

// --- Voice Assistant Functions ---
export const generateSpeech = async (textToSpeak: string): Promise<string | null> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: textToSpeak }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return base64Audio || null;
    } catch (error) {
        console.error("Gemini API error in generateSpeech:", error);
        return null;
    }
};

export const routeVoiceCommand = async (text: string): Promise<VoiceCommandResult> => {
    const prompt = `You are a voice command router for a medical assistant app. Analyze the user's request and classify it.
- If the user wants to book an appointment, the intent is 'BOOK_APPOINTMENT'. Extract the medical specialty.
- If the user is asking a general question, the intent is 'GENERAL_QUESTION'. Extract the full question.
- If the user wants to know about their profile (name, allergies, etc.), the intent is 'GET_PROFILE_INFO'.
- If the user wants to know about their scheduled appointments, the intent is 'GET_APPOINTMENTS'.
- If the user wants to know about their medications, the intent is 'GET_MEDICATIONS'.
- If the user wants to end the conversation (e.g., "goodbye", "that's all"), the intent is 'END_CONVERSATION'.
- If the intent is unclear, respond with 'UNKNOWN'.

User's request: "${text}"`;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        intent: {
                            type: Type.STRING,
                            description: "One of: 'BOOK_APPOINTMENT', 'GENERAL_QUESTION', 'GET_PROFILE_INFO', 'GET_APPOINTMENTS', 'GET_MEDICATIONS', 'END_CONVERSATION', 'UNKNOWN'"
                        },
                        specialty: {
                            type: Type.STRING,
                            description: "The medical specialty, e.g., 'Cardiology'. Only if intent is 'BOOK_APPOINTMENT'."
                        },
                        question: {
                            type: Type.STRING,
                            description: "The user's full question. Only if intent is 'GENERAL_QUESTION'."
                        }
                    },
                    required: ["intent"]
                }
            }
        });

        const jsonStr = response.text.trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Gemini API error in routeVoiceCommand:", error);
        return { intent: 'UNKNOWN' };
    }
};