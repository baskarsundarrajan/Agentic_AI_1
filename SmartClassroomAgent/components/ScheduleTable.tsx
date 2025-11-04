import React, { useState, useMemo } from 'react';
import type { ScheduleEntry } from '../types';
import { faculty as facultyData } from '../data/faculty';
import { courses as courseData } from '../data/courses';

interface ScheduleTableProps {
  schedule: ScheduleEntry[];
}

const statusColors = {
  Scheduled: 'bg-green-100 text-green-800',
  Pending: 'bg-yellow-100 text-yellow-800',
  Conflict: 'bg-red-100 text-red-800',
  'No Room': 'bg-gray-200 text-gray-800',
};

const facultyMap = new Map(facultyData.map(f => [f.facultyid, f.facultyname]));
const courseMap = new Map(courseData.map(c => [c.coursecode, c.coursename]));

const ScheduleTable: React.FC<ScheduleTableProps> = ({ schedule }) => {
  const [programFilter, setProgramFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');

  const programs = useMemo(() => [...new Set(schedule.map(s => s.programme).filter(Boolean))], [schedule]);
  const semesters = useMemo(() => [...new Set(schedule.map(s => s.semester).filter(Boolean))].sort(), [schedule]);
  
  const filteredSchedule = useMemo(() => {
    return schedule.filter(item => {
      const programMatch = programFilter ? item.programme === programFilter : true;
      const semesterMatch = semesterFilter ? item.semester === semesterFilter : true;
      return programMatch && semesterMatch;
    });
  }, [schedule, programFilter, semesterFilter]);

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <select 
          value={programFilter} 
          onChange={e => setProgramFilter(e.target.value)}
          className="w-full sm:w-1/2 bg-white border border-gray-300 rounded-md py-2 px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Filter by Program...</option>
          {programs.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select 
          value={semesterFilter} 
          onChange={e => setSemesterFilter(e.target.value)}
          className="w-full sm:w-1/2 bg-white border border-gray-300 rounded-md py-2 px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Filter by Semester...</option>
          {semesters.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-700">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3">Program</th>
              <th scope="col" className="px-4 py-3">Course</th>
              <th scope="col" className="px-4 py-3">Faculty</th>
              <th scope="col" className="px-4 py-3">Day & Time</th>
              <th scope="col" className="px-4 py-3">Room</th>
              <th scope="col" className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredSchedule.map((item, index) => (
              <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{item.programme} (Sem {item.semester})</td>
                <td className="px-4 py-3" title={courseMap.get(item.coursecode)}>{item.coursecode}</td>
                <td className="px-4 py-3">{facultyMap.get(item.faculty) || item.faculty}</td>
                <td className="px-4 py-3">{item.day}, {item.timeslot}</td>
                <td className="px-4 py-3">{item.classroomid}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${statusColors[item.status]}`}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
         {filteredSchedule.length === 0 && (
          <p className="text-center text-gray-500 py-8">No schedules match the current filters.</p>
        )}
      </div>
    </div>
  );
};

export default ScheduleTable;