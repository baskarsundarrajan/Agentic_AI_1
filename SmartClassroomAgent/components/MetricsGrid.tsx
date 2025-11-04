import React from 'react';
import MetricCard from './MetricCard';

interface MetricsGridProps {
  metrics: {
    total: number;
    pending: number;
    scheduled: number;
    conflicts: number;
    noRoom: number;
  };
}

const MetricsGrid: React.FC<MetricsGridProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <MetricCard label="Total Schedules" value={metrics.total} color="indigo" />
      <MetricCard label="Pending" value={metrics.pending} color="yellow" />
      <MetricCard label="Scheduled" value={metrics.scheduled} color="green" />
      <MetricCard label="Conflicts" value={metrics.conflicts} color="red" />
      <MetricCard label="No Room" value={metrics.noRoom} color="gray" />
    </div>
  );
};

export default MetricsGrid;
