import React from 'react';

interface MetricCardProps {
  label: string;
  value: number;
  color: 'indigo' | 'yellow' | 'green' | 'red' | 'gray';
}

const colorClasses = {
  indigo: 'border-indigo-500',
  yellow: 'border-yellow-500',
  green: 'border-green-500',
  red: 'border-red-500',
  gray: 'border-gray-500',
};

const MetricCard: React.FC<MetricCardProps> = ({ label, value, color }) => {
  return (
    <div className={`bg-white p-4 rounded-lg shadow-lg border-t-4 ${colorClasses[color]}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
};

export default MetricCard;