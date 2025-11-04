import React from 'react';
import type { ScheduleEntry } from '../types';
import FacultyWorkloadChart from './FacultyWorkloadChart';
import RoomUtilizationChart from './RoomUtilizationChart';
import WeeklyClassCountChart from './WeeklyClassCountChart';

interface AnalyticsDashboardProps {
  schedule: ScheduleEntry[];
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ schedule }) => {
  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Analytics Dashboard</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FacultyWorkloadChart schedule={schedule} />
        <RoomUtilizationChart schedule={schedule} />
        <WeeklyClassCountChart schedule={schedule} />
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
