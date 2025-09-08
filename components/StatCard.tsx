import React from 'react';
import { StatCardProps } from '../types';

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, loading }) => {
  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-md flex items-center justify-between transition-colors duration-200">
      <div>
        <p className="text-sm font-medium text-gray-400">{title}</p>
        {loading ? (
          <div className="h-8 w-24 bg-gray-700 rounded-md animate-pulse mt-1"></div>
        ) : (
          <p className="text-3xl font-bold text-gray-100">{value}</p>
        )}
      </div>
      <div className="text-primary-500 bg-primary-900/50 p-3 rounded-full">
        {icon}
      </div>
    </div>
  );
};

export default StatCard;
