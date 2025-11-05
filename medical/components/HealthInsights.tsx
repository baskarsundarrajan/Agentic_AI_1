
import React, { useState } from 'react';
import { getHealthInsight } from '../services/geminiService';
import Loader from './shared/Loader';

const HealthInsights: React.FC = () => {
    const [diaryEntry, setDiaryEntry] = useState('');
    const [insight, setInsight] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [pastInsights, setPastInsights] = useState<string[]>([]);

    const handleGenerateInsight = async () => {
        if (!diaryEntry) return;
        setIsLoading(true);
        setInsight('');
        try {
            const newInsight = await getHealthInsight(diaryEntry);
            setInsight(newInsight);
            setPastInsights(prev => [newInsight, ...prev].slice(0, 3)); // Keep last 3
            setDiaryEntry('');
        } catch (error) {
            console.error(error);
            setInsight('Failed to generate an insight. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const inputStyles = "w-full p-2 bg-slate-800/70 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-400 text-slate-100 border border-slate-600 placeholder-slate-400";

    return (
        <div className="p-6 h-full overflow-y-auto text-slate-200">
            <h2 className="text-xl font-bold text-slate-100 mb-4 text-center">Personalized Health Insights</h2>
            <p className="text-sm text-slate-400 mb-4 text-center">
                Log your daily activity, mood, or any health-related notes to receive personalized tips and motivation.
            </p>
            <textarea
                placeholder="How are you feeling today? Any activities or meals to note?"
                className={`${inputStyles} h-32 mb-2`}
                value={diaryEntry}
                onChange={(e) => setDiaryEntry(e.target.value)}
            />
            <button
                onClick={handleGenerateInsight}
                disabled={isLoading || !diaryEntry}
                className="w-full neon-button rounded-md py-2 flex items-center justify-center"
            >
                {isLoading ? <Loader /> : 'Generate My Insight'}
            </button>
            {insight && (
                <div className="mt-6 border-t border-cyan-300/20 pt-6">
                    <h3 className="text-lg font-semibold mb-2">Today's Insight</h3>
                    <div className="p-4 bg-indigo-500/20 text-indigo-200 rounded-lg whitespace-pre-wrap border border-indigo-400/50">
                        {insight}
                    </div>
                </div>
            )}
             {pastInsights.length > 0 && (
                <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-2">Recent Insights</h3>
                    <div className="space-y-2">
                        {pastInsights.map((ins, i) => (
                             <div key={i} className="p-3 bg-slate-800/50 border border-slate-700 rounded-md text-sm text-slate-400 opacity-80">
                                {ins.substring(0, 150)}...
                            </div>
                        ))}
                    </div>
                </div>
             )}
        </div>
    );
};

export default HealthInsights;