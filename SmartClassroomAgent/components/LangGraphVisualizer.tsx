import React from 'react';

const GraphNode: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="bg-gray-100 p-4 rounded-lg shadow-inner text-center flex-1">
    <h4 className="font-bold text-indigo-700 text-sm">{title}</h4>
    <p className="text-xs text-gray-600 mt-1">{description}</p>
  </div>
);

const Arrow: React.FC = () => (
    <div className="flex-shrink-0 mx-2 text-gray-400 text-2xl font-light self-center hidden md:block">&rarr;</div>
);


const LangGraphVisualizer: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">Agent's Reasoning Flow (LangGraph)</h2>
      <div className="flex flex-col md:flex-row items-stretch justify-between gap-4 overflow-x-auto py-2">
        <GraphNode title="1. Intent Detection" description="Identify user's goal" />
        <Arrow />
        <GraphNode title="2. Entity Extraction" description="Extract key details" />
        <Arrow />
        <GraphNode title="3. Data Retrieval" description="Fetch from CSVs" />
        <Arrow />
        <GraphNode title="4. Reasoning & Validation" description="Check for conflicts" />
        <Arrow />
        <GraphNode title="5. Response Formatting" description="Generate structured JSON" />
      </div>
    </div>
  );
};

export default LangGraphVisualizer;
