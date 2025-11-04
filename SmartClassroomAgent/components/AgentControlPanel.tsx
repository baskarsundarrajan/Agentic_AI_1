import React, { useState } from 'react';
import { RefreshIcon, LoadingIcon } from './Icons';

interface AgentControlPanelProps {
  onRunAgent: () => Promise<void>;
}

const AgentControlPanel: React.FC<AgentControlPanelProps> = ({ onRunAgent }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastRun, setLastRun] = useState('Not run yet.');

  const handleClick = async () => {
    setIsLoading(true);
    await onRunAgent();
    setLastRun(`Today at ${new Date().toLocaleTimeString()}`);
    setIsLoading(false);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg text-center">
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 transition-colors duration-200 flex items-center justify-center mx-auto disabled:bg-indigo-400 disabled:cursor-not-allowed"
      >
        {isLoading ? <LoadingIcon className="h-5 w-5 text-white"/> : <RefreshIcon />}
        <span className="ml-2">{isLoading ? 'Processing...' : 'Run Agent Workflow'}</span>
      </button>
      <p className="text-xs text-gray-500 mt-3">
        Last run: {lastRun}
      </p>
    </div>
  );
};

export default AgentControlPanel;
