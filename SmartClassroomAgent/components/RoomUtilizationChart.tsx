import React, { useMemo } from 'react';
import type { ScheduleEntry } from '../types';
import { classrooms } from '../data/classroom';

interface RoomUtilizationChartProps {
  schedule: ScheduleEntry[];
}

const RoomUtilizationChart: React.FC<RoomUtilizationChartProps> = ({ schedule }) => {
  const utilizationData = useMemo(() => {
    const utilization: { [key: string]: number } = {};
    schedule.forEach(item => {
      if (item.classroomid) {
        utilization[item.classroomid] = (utilization[item.classroomid] || 0) + 1;
      }
    });

    // Ensure all classrooms are present, even if with 0 utilization
    classrooms.forEach(room => {
        if (!utilization[room.classid]) {
            utilization[room.classid] = 0;
        }
    });
    
    return Object.entries(utilization)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7); // Show top 7
  }, [schedule]);

  const maxCount = useMemo(() => Math.max(...utilizationData.map(d => d.count), 0), [utilizationData]);

  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h3 className="font-bold text-md text-gray-800 mb-4 text-center">Room Utilization (Top 7)</h3>
      <div className="space-y-2">
        {utilizationData.map(item => (
          <div key={item.name} className="flex items-center text-xs">
            <span className="w-1/3 truncate pr-2 text-right">{item.name}</span>
            <div className="w-2/3 bg-gray-200 rounded-full h-4">
              <div
                className="bg-teal-500 h-4 rounded-full text-white text-center flex items-center justify-center"
                style={{ width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%` }}
              >
               {item.count}
              </div>
            </div>
          </div>
        ))}
        {utilizationData.length === 0 && <p className="text-center text-gray-500 text-sm">No data to display.</p>}
      </div>
    </div>
  );
};

export default RoomUtilizationChart;
