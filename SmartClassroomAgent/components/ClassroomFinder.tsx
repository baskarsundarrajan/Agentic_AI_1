import React, { useState, useMemo } from 'react';
import { SearchIcon, LoadingIcon } from './Icons';
import { classrooms } from '../data/classroom';
import { schedule } from '../data/schedule';
import type { Classroom } from '../types';
import { runGeminiAgent } from '../services/geminiService';

const ClassroomFinder: React.FC = () => {
  const [capacity, setCapacity] = useState('');
  const [day, setDay] = useState('Monday');
  const [timeSlot, setTimeSlot] = useState('');
  const [results, setResults] = useState<Classroom[]>([]);
  const [searched, setSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const uniqueDays = useMemo(() => [...new Set(schedule.map(s => s.day))].sort(), []);
  const uniqueTimeSlots = useMemo(() => [...new Set(schedule.map(s => s.timeslot))].sort((a,b) => a.localeCompare(b)), []);


  const handleFind = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
    setIsLoading(true);
    setResults([]);

    const cap = parseInt(capacity, 10);

    if (isNaN(cap) || !day || !timeSlot) {
      setIsLoading(false);
      return;
    }

    const prompt = `Find available classrooms for ${cap} students on ${day} during the timeslot ${timeSlot}.`;
    const response = await runGeminiAgent(prompt);

    if (response && response.type === 'classroom_finder' && response.result) {
        const classroomDetails = response.result.map((res: any) => {
            const fullClassroom = classrooms.find(c => c.classid === res.classid);
            return fullClassroom || res; 
        });
        setResults(classroomDetails);
    } else {
        console.error("Classroom finder error:", response);
    }
    setIsLoading(false);
  };

  return (
    <div className="bg-indigo-50 p-6 rounded-lg shadow-lg h-full">
      <h3 className="font-bold text-lg text-gray-900 mb-4">Quick Classroom Finder</h3>
      <form onSubmit={handleFind} className="space-y-4">
        <input
          type="number"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          placeholder="Required Capacity (e.g., 40)"
          className="w-full bg-white border border-gray-300 rounded-md py-2 px-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={day}
          onChange={(e) => setDay(e.target.value)}
          className="w-full bg-white border border-gray-300 rounded-md py-2 px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {uniqueDays.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          value={timeSlot}
          onChange={(e) => setTimeSlot(e.target.value)}
          className="w-full bg-white border border-gray-300 rounded-md py-2 px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          required
        >
          <option value="">Select Time Slot</option>
          {uniqueTimeSlots.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-indigo-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors flex items-center justify-center disabled:bg-indigo-400"
        >
          {isLoading ? <LoadingIcon className="h-5 w-5 text-white"/> : <SearchIcon />}
          <span className="ml-2">{isLoading ? 'Finding...' : 'Find Class'}</span>
        </button>
      </form>
      <div className="mt-4">
        {isLoading && <p className="text-center text-gray-500 mt-4">Agent is thinking...</p>}
        {!isLoading && searched && results.length > 0 && (
          <ul className="space-y-2 text-sm max-h-40 overflow-y-auto">
            <li className="font-semibold text-gray-600">Available Rooms:</li>
            {results.map(r => (
              <li key={r.classid} className="bg-indigo-100 text-gray-800 p-2 rounded-md">
                <span className="font-bold">{r.classid}</span> (Cap: {r.capacity}, Type: {r.type})
              </li>
            ))}
          </ul>
        )}
        {!isLoading && searched && results.length === 0 && (
          <p className="text-center text-gray-500 mt-4">No available classrooms match the criteria.</p>
        )}
      </div>
    </div>
  );
};

export default ClassroomFinder;