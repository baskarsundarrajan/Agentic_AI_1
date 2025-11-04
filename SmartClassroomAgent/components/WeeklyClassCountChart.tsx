import React, { useMemo } from 'react';
import type { ScheduleEntry } from '../types';

interface WeeklyClassCountChartProps {
  schedule: ScheduleEntry[];
}

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const WeeklyClassCountChart: React.FC<WeeklyClassCountChartProps> = ({ schedule }) => {
  const weeklyData = useMemo(() => {
    const counts: { [key: string]: number } = { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0 };
    schedule.forEach(item => {
      if (daysOfWeek.includes(item.day)) {
        counts[item.day]++;
      }
    });

    return daysOfWeek.map(day => ({ name: day, count: counts[day] }));
  }, [schedule]);

  const maxCount = useMemo(() => Math.max(...weeklyData.map(d => d.count), 0), [weeklyData]);

  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h3 className="font-bold text-md text-gray-800 mb-4 text-center">Classes Per Day</h3>
       <div className="space-y-2">
        {weeklyData.map(item => (
          <div key={item.name} className="flex items-center text-xs">
            <span className="w-1/3 truncate pr-2 text-right">{item.name}</span>
            <div className="w-2/3 bg-gray-200 rounded-full h-4">
              <div
                className="bg-amber-500 h-4 rounded-full text-white text-center flex items-center justify-center"
                style={{ width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%` }}
              >
               {item.count}
              </div>
            </div>
          </div>
        ))}
         {weeklyData.length === 0 && <p className="text-center text-gray-500 text-sm">No data to display.</p>}
      </div>
    </div>
  );
};

export default WeeklyClassCountChart;
