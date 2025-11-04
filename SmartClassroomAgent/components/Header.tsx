import React from 'react';
import { GraduationCapIcon } from './Icons';

const Header: React.FC = () => {
  return (
    <header className="flex items-center space-x-3">
       <div className="p-2 bg-indigo-600 rounded-lg">
        <GraduationCapIcon />
      </div>
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
        Smart Classroom Agent System
      </h1>
    </header>
  );
};

export default Header;