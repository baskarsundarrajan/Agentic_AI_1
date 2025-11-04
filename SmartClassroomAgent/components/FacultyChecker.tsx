import React, { useState, useMemo } from 'react';
import { SearchIcon, LoadingIcon } from './Icons';
import { faculty } from '../data/faculty';
import { schedule } from '../data/schedule';
import { runGeminiAgent } from '../services/geminiService';

const FacultyChecker: React.FC = () => {
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [day, setDay] = useState('Monday');
  const [timeSlot, setTimeSlot] = useState('');
  const [result, setResult] = useState<{ status: 'Free' | 'Busy', reason: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const uniqueDays = useMemo(() => [...new Set(schedule.map(s => s.day))].sort(), []);
  const uniqueTimeSlots = useMemo(() => [...new Set(schedule.map(s => s.timeslot))].sort((a,b) => a.localeCompare(b)), []);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    if (!selectedFaculty || !day || !timeSlot) {
      setIsLoading(false);
      return;
    };
    
    const prompt = `Is ${selectedFaculty} available on ${day} at ${timeSlot}?`;
    const response = await runGeminiAgent(prompt);

    if (response && response.type === 'faculty_availability' && response.result) {
        setResult(response.result);
    } else {
        console.error("Faculty checker error:", response);
        setResult({ status: 'Busy', reason: 'Error checking availability.' });
    }
    setIsLoading(false);
  };

  return (
    <div className="bg-teal-50 p-6 rounded-lg shadow-lg h-full">
      <h3 className="font-bold text-lg text-gray-900 mb-4">Faculty Availability Check</h3>
      <form onSubmit={handleCheck} className="space-y-4">
        <select
          value={selectedFaculty}
          onChange={(e) => setSelectedFaculty(e.target.value)}
          className="w-full bg-white border border-gray-300 rounded-md py-2 px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
          required
        >
          <option value="">Select Faculty</option>
          {faculty.map(f => <option key={f.facultyid} value={f.facultyname}>{f.facultyname}</option>)}
        </select>
        <select
          value={day}
          onChange={(e) => setDay(e.target.value)}
          className="w-full bg-white border border-gray-300 rounded-md py-2 px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          {uniqueDays.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          value={timeSlot}
          onChange={(e) => setTimeSlot(e.target.value)}
          className="w-full bg-white border border-gray-300 rounded-md py-2 px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
          required
        >
          <option value="">Select Time Slot</option>
          {uniqueTimeSlots.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-teal-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-teal-700 transition-colors flex items-center justify-center disabled:bg-teal-400"
        >
          {isLoading ? <LoadingIcon className="h-5 w-5 text-white"/> : <SearchIcon />}
          <span className="ml-2">{isLoading ? 'Checking...' : 'Check Availability'}</span>
        </button>
      </form>
      {isLoading && <p className="text-center text-gray-500 mt-4">Agent is checking...</p>}
      {!isLoading && result && (
        <div className="mt-4 text-center p-3 rounded-md">
           <p className={`font-bold text-lg ${result.status === 'Busy' ? 'text-red-600' : 'text-green-600'}`}>
            STATUS: {result.status.toUpperCase()}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-semibold">{selectedFaculty}</span> {result.reason}
          </p>
        </div>
      )}
    </div>
  );
};

export default FacultyChecker;
