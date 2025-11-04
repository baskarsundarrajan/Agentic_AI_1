import React, { useState, useCallback, useMemo } from 'react';
import { schedule as initialSchedule } from '../data/schedule';
import type { ScheduleEntry } from '../types';
import { runGeminiAgent } from '../services/geminiService';
import Header from './Header';
import MetricsGrid from './MetricsGrid';
import AgentControlPanel from './AgentControlPanel';
import ClassroomFinder from './ClassroomFinder';
import FacultyChecker from './FacultyChecker';
import ScheduleTable from './ScheduleTable';
import AgentLogs from './AgentLogs';
import AnalyticsDashboard from './AnalyticsDashboard';
import LangGraphVisualizer from './LangGraphVisualizer';


const Dashboard: React.FC = () => {
  const [schedule, setSchedule] = useState<ScheduleEntry[]>(initialSchedule);
  const [agentLogs, setAgentLogs] = useState<string[]>(["Agent initialized. Waiting for tasks."]);

  const metrics = useMemo(() => {
    return schedule.reduce(
      (acc, s) => {
        acc.total++;
        if (s.status === 'Pending') acc.pending++;
        if (s.status === 'Scheduled') acc.scheduled++;
        if (s.status === 'Conflict') acc.conflicts++;
        if (s.status === 'No Room') acc.noRoom++;
        return acc;
      },
      { total: 0, pending: 0, scheduled: 0, conflicts: 0, noRoom: 0 }
    );
  }, [schedule]);

  const handleRunAgent = useCallback(async () => {
    setAgentLogs(prev => ["Starting agent workflow to resolve conflicts and pending tasks..."]);
    const prompt = "Run the agent workflow to resolve all conflicts and schedule pending classes.";
    const response = await runGeminiAgent(prompt);

    if (response && response.type === 'agent_workflow' && response.result) {
      setSchedule(response.result.schedule);
      setAgentLogs(prev => [...prev, ...response.result.logs, "Workflow complete."]);
    } else {
      console.error("Agent workflow error:", response);
      const errorMessage = response?.result?.details || "An unknown error occurred.";
      setAgentLogs(prev => [...prev, `Error during workflow: ${errorMessage}`]);
    }
  }, []);

  return (
    <div className="space-y-6">
      <Header />
      <MetricsGrid metrics={metrics} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AgentControlPanel onRunAgent={handleRunAgent} />
        <ClassroomFinder />
        <FacultyChecker />
      </div>

      <ScheduleTable schedule={schedule} />

      <AnalyticsDashboard schedule={schedule} />
      
      <LangGraphVisualizer />

      <AgentLogs logs={agentLogs} />

    </div>
  );
};

export default Dashboard;