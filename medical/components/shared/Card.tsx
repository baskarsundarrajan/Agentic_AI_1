
import React from 'react';

interface CardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ title, icon, children, className = '' }) => {
  return (
    <div className={`glassmorphic-card overflow-hidden transform hover:scale-[1.02] transition-transform duration-300 ${className}`}>
      <div className="p-6">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0 bg-cyan-400/20 text-teal-300 rounded-lg p-2 mr-4">
            {icon}
          </div>
          <h3 className="text-xl font-semibold text-slate-100">{title}</h3>
        </div>
        <div className="text-slate-300">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Card;