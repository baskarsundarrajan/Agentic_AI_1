import React from 'react';

interface AgentLogsProps {
  logs: string[];
}

const AgentLogs: React.FC<AgentLogsProps> = ({ logs }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg h-full">
      <h3 className="font-bold text-lg text-gray-900 mb-4">Agent Logs</h3>
      <div className="bg-gray-50 rounded-md p-4 h-96 overflow-y-auto">
        {logs.map((log, index) => {
          let logColor = 'text-gray-600';
          if (log.toLowerCase().includes('complete')) logColor = 'text-green-600';
          if (log.toLowerCase().includes('conflict') || log.toLowerCase().includes('error')) logColor = 'text-red-600';
          
          return (
            <p key={index} className={`font-mono text-xs ${logColor} mb-1 animate-fadeIn`}>
              {log}
            </p>
          );
        })}
      </div>
    </div>
  );
};

export default AgentLogs;