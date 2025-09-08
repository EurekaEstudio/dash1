import React from 'react';
import { useTable } from '../contexts/TableContext';
import { ChevronUpDownIcon } from './icons';

const TableSelector: React.FC = () => {
  const { tableConfigs, currentConfig, setCurrentConfigId, loading } = useTable();

  if (loading) {
    return <div className="h-10 w-64 bg-gray-700 rounded-md animate-pulse"></div>;
  }
  
  if (!currentConfig) return null;

  const configCount = Object.keys(tableConfigs).length;

  if (configCount <= 1) {
    return (
      <div className="flex items-center h-10 px-3 py-1.5">
        <h1 className="text-white text-sm font-semibold">{currentConfig.name}</h1>
      </div>
    );
  }

  return (
    <div className="relative">
      <select
        id="table-selector"
        value={currentConfig.id}
        onChange={(e) => setCurrentConfigId(e.target.value)}
        className="w-full md:w-64 appearance-none rounded-md border-0 bg-white/5 py-1.5 pl-3 pr-10 text-white text-sm font-semibold ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-primary-500"
      >
        {Object.values(tableConfigs).map((config) => (
          <option key={config.id} value={config.id} className="bg-gray-800">
            {config.name}
          </option>
        ))}
      </select>
      <ChevronUpDownIcon
        className="pointer-events-none absolute right-3 top-2.5 h-5 w-5 text-gray-400"
        aria-hidden="true"
      />
    </div>
  );
};

export default TableSelector;