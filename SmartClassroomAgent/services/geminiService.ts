import { GoogleGenAI } from "@google/genai";
import { schedule } from '../data/schedule';
import { classrooms } from '../data/classroom';
import { faculty } from '../data/faculty';
import { courses } from '../data/courses';

// Helper to convert array of objects to CSV string
const toCsv = (data: any[]) => {
    if (data.length === 0) return "";
    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','),
        ...data.map(row => headers.map(header => JSON.stringify(row[header])).join(','))
    ];
    return csvRows.join('\n');
};

const scheduleCsv = toCsv(schedule);
const classroomsCsv = toCsv(classrooms);
const facultyCsv = toCsv(faculty);
const coursesCsv = toCsv(courses);

const systemPrompt = `You are an Agentic AI Assistant built using LangGraph principles to manage academic scheduling tasks.
Use the following CSV data files: schedule, faculty, classroom, and courses.

Your reasoning flow should follow a LangGraph-like structure:

1. Intent Detection → Identify if the user wants to find a classroom, check faculty availability, view a timetable, or run the agent workflow to resolve issues.
2. Entity Extraction → Extract details such as day, time, faculty, class, or programme.
3. Data Retrieval → Fetch relevant data from the provided CSVs.
4. Reasoning & Validation → Check for conflicts, time overlaps, and availability. For time overlap checks, convert times like '9:30-11:30' to minutes and see if the ranges intersect. A conflict exists if (StartA < EndB) and (EndA > StartB).
5. Response Formatting → Display results in a structured format. Do not use markdown. Respond with JSON.

Here is the data:
--- START OF schedule.csv ---
${scheduleCsv}
--- END OF schedule.csv ---

--- START OF classroom.csv ---
${classroomsCsv}
--- END OF classroom.csv ---

--- START OF faculty.csv ---
${facultyCsv}
--- END OF faculty.csv ---

--- START OF courses.csv ---
${coursesCsv}
--- END OF courses.csv ---

RESPONSE FORMATTING RULES:

-   When finding a classroom, respond with a JSON object:
    {
      "type": "classroom_finder",
      "result": [
        { "classid": "...", "capacity": ..., "type": "..." }
      ]
    }
-   When checking faculty availability, respond with a JSON object:
    {
      "type": "faculty_availability",
      "result": { "status": "Free" | "Busy", "reason": "..." }
    }
-   When running the agent workflow, respond with a JSON object containing the updated schedule and the logs of actions taken:
    {
        "type": "agent_workflow",
        "result": {
            "schedule": [ ],
            "logs": [ "...log message 1...", "...log message 2..." ]
        }
    }
    The schedule array in the response must contain the full, updated schedule.

Always think step-by-step like a LangGraph — each reasoning stage acts as a small sub-agent passing results forward until the final answer is produced.
`;


let ai: GoogleGenAI;

const getAI = () => {
    if (!ai) {
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    }
    return ai;
}


export const runGeminiAgent = async (prompt: string): Promise<any> => {
    try {
        const genAI = getAI();
        const response = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
// Fix: The `contents` property was using a nested array structure (`[{ parts: [...] }]`), which is not the standard way for a single query. It has been simplified to a direct string (`prompt`) for correctness and clarity as per the API guidelines.
            contents: prompt,
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: 'application/json',
            }
        });

        const text = response.text.trim();
        const cleanedText = text.replace(/^```json\s*|```\s*$/g, '');
        return JSON.parse(cleanedText);

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return {
            type: "error",
            result: {
                message: "Failed to communicate with the AI agent.",
                details: error instanceof Error ? error.message : String(error)
            }
        };
    }
};