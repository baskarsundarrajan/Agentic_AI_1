
import React from 'react';
import { View } from '../types';
import { CalendarIcon, FileTextIcon, PillIcon, SparklesIcon, StethoscopeIcon, UserIcon } from './shared/IconComponents';

interface HeaderProps {
    activeView: View;
    setActiveView: (view: View) => void;
    handleSignOut: () => void;
}

const NavItem = ({ view, label, icon, activeView, setActiveView }: { 
    view: View; 
    label: string; 
    icon: React.ReactNode; 
    activeView: View; 
    setActiveView: (view: View) => void; 
}) => (
    <button
        onClick={() => setActiveView(view)}
        className={`flex items-center px-3 py-2 rounded-md transition-all duration-300 text-sm font-medium transform hover:scale-105 hover:text-teal-300 ${
            activeView === view
                ? 'bg-cyan-400/20 text-teal-300 shadow-[0_0_10px_rgba(100,255,218,0.5)]'
                : 'text-slate-300'
        }`}
    >
        {icon}
        <span className="ml-2 font-orbitron">{label}</span>
    </button>
);

const Header: React.FC<HeaderProps> = ({ activeView, setActiveView, handleSignOut }) => {
    return (
        <header className="glassmorphic-header p-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-full flex items-center justify-center mr-3 text-white shadow-[0_0_15px_rgba(0,198,255,0.6)] animate-spin" style={{ animationDuration: '10s', animationIterationCount: 'infinite', animationTimingFunction: 'linear' }}>
                    <StethoscopeIcon />
                </div>
                <h1 className="text-xl font-bold text-slate-100">MedCrew AI</h1>
            </div>
            <div className="flex items-center gap-4">
                <nav className="flex items-center space-x-1 flex-wrap">
                    <NavItem view="symptom-checker" label="Checker" icon={<StethoscopeIcon />} activeView={activeView} setActiveView={setActiveView} />
                    <NavItem view="scheduler" label="Scheduler" icon={<CalendarIcon />} activeView={activeView} setActiveView={setActiveView} />
                    <NavItem view="patient-profile" label="Profile" icon={<UserIcon />} activeView={activeView} setActiveView={setActiveView} />
                    <NavItem view="medication-manager" label="Meds" icon={<PillIcon />} activeView={activeView} setActiveView={setActiveView} />
                    <NavItem view="consultation-analyzer" label="Consults" icon={<FileTextIcon />} activeView={activeView} setActiveView={setActiveView} />
                    <NavItem view="health-insights" label="Insights" icon={<SparklesIcon />} activeView={activeView} setActiveView={setActiveView} />
                </nav>
                <button
                    onClick={handleSignOut}
                    className="neon-button-secondary text-xs rounded-full px-4 py-2 transform hover:scale-105"
                >
                    Sign Out
                </button>
            </div>
        </header>
    );
};

export default Header;
