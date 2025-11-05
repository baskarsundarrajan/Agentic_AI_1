
import React from 'react';
import { AgentState, AgentStatus } from '../types';
import Loader from './shared/Loader';
import { CpuChipIcon } from './shared/IconComponents';

const StatusIcon: React.FC<{ status: AgentStatus }> = ({ status }) => {
    if (status === 'active') {
        return <div className="w-5 h-5"><Loader /></div>;
    }
    return null;
};

const AgentStatusPanel: React.FC<{ agentStates: AgentState[] }> = ({ agentStates }) => {
  return (
    <div className="glassmorphic-card h-full p-4 flex flex-col">
      <h2 className="text-xl font-orbitron text-slate-100 mb-4 text-center border-b border-cyan-300/20 pb-2">
        CrewAI Agents Status
      </h2>
      <div className="space-y-3 overflow-y-auto pr-2">
        {agentStates.map(agent => (
          <div key={agent.id} className={`p-3 rounded-lg border transition-all duration-300 ${
            agent.status === 'active' ? 'bg-cyan-900/50 border-cyan-600 shadow-lg shadow-cyan-500/10' : 'bg-slate-800/50 border-slate-700'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <div className="text-teal-400 mr-2"><CpuChipIcon /></div>
                <h3 className="font-semibold text-slate-200">{agent.name}</h3>
              </div>
              <div className="h-5 w-5 flex items-center justify-center">
                <StatusIcon status={agent.status} />
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-mono">
                <span className="font-bold text-slate-300">
                  {agent.status === 'active' ? 'Thinking: ' : agent.status === 'idle' ? 'Status: ' : 'Output: '}
                </span>
                {agent.thought}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AgentStatusPanel;
