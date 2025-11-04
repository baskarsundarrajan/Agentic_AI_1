import React, { useMemo } from 'react';
import type { ScheduleEntry } from '../types';
import { faculty as facultyData } from '../data/faculty';

interface FacultyWorkloadChartProps {
  schedule: ScheduleEntry[];
}

const facultyMap = new Map(facultyData.map(f => [f.facultyid, f.facultyname]));

const FacultyWorkloadChart: React.FC<FacultyWorkloadChartProps> = ({ schedule }) => {
  const workloadData = useMemo(() => {
    const workload: { [key: string]: number } = {};
    schedule.forEach(item => {
      if (item.faculty) {
        const facultyName = facultyMap.get(item.faculty) || item.faculty;
        workload[facultyName] = (workload[facultyName] || 0) + 1;
      }
    });

    return Object.entries(workload)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7); // Show top 7 for brevity
  }, [schedule]);

  const maxCount = useMemo(() => Math.max(...workloadData.map(d => d.count), 0), [workloadData]);

  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h3 className="font-bold text-md text-gray-800 mb-4 text-center">Faculty Workload (Top 7)</h3>
      <div className="space-y-2">
        {workloadData.map(item => (
          <div key={item.name} className="flex items-center text-xs">
            <span className="w-1/3 truncate pr-2 text-right">{item.name}</span>
            <div className="w-2/3 bg-gray-200 rounded-full h-4">
              <div
                className="bg-indigo-500 h-4 rounded-full text-white text-center flex items-center justify-center"
                style={{ width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%` }}
              >
               {item.count}
              </div>
            </div>
          </div>
        ))}
         {workloadData.length === 0 && <p className="text-center text-gray-500 text-sm">No data to display.</p>}
      </div>
    </div>
  );
};

export default FacultyWorkloadChart;
