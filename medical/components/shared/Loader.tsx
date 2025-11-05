
import React from 'react';

const Loader: React.FC = () => {
  return (
    <div className="relative w-8 h-8 flex items-center justify-center">
      <div className="absolute w-full h-full border-2 border-cyan-400/50 rounded-full"></div>
      <div className="absolute w-full h-full border-t-2 border-t-cyan-400 rounded-full animate-spin" style={{ animationDuration: '1s' }}></div>
      <div className="absolute w-2/3 h-2/3 border-b-2 border-b-teal-400 rounded-full animate-spin" style={{ animationDuration: '1.5s' }}></div>
       <p className="text-xs text-teal-300 font-orbitron">AI</p>
    </div>
  );
};

export default Loader;