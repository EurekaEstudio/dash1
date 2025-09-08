import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import { TableConfig } from '../types';
import { tableConfigs as allConfigs } from '../config/tableConfigs';

interface TableContextType {
  tableConfigs: Record<string, TableConfig>;
  currentConfig: TableConfig | null;
  setCurrentConfigId: (id: string) => void;
  loading: boolean;
}

const TableContext = createContext<TableContextType | undefined>(undefined);

export const TableProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [currentConfigId, setCurrentConfigId] = useState<string | null>(null);

  // For now, configs are static. This could be extended to fetch them.
  const tableConfigs = allConfigs;

  useEffect(() => {
    // Set default table on initial load
    const firstTableId = Object.keys(tableConfigs)[0];
    if (firstTableId) {
      setCurrentConfigId(firstTableId);
    }
    setLoading(false);
  }, []); // Empty dependency array means this runs once on mount

  const currentConfig = useMemo(() => {
    if (!currentConfigId) return null;
    return tableConfigs[currentConfigId] || null;
  }, [currentConfigId, tableConfigs]);

  const value = {
    tableConfigs,
    currentConfig,
    setCurrentConfigId,
    loading,
  };

  return (
    <TableContext.Provider value={value}>
      {children}
    </TableContext.Provider>
  );
};

export const useTable = (): TableContextType => {
  const context = useContext(TableContext);
  if (context === undefined) {
    throw new Error('useTable must be used within a TableProvider');
  }
  return context;
};
