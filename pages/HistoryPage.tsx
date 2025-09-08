import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Message } from '../types';
import { ChevronDownIcon, ChevronRightIcon, DownloadIcon } from '../components/icons';
import Pagination from '../components/Pagination';
import { useTable } from '../contexts/TableContext';
import DatePresetPicker from '../components/DatePresetPicker';

const PAGE_SIZE = 15;

const HistoryPage: React.FC = () => {
  const { currentConfig } = useTable();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [groupedMessages, setGroupedMessages] = useState<Record<string, Message[]>>({});
  const [sessionOrder, setSessionOrder] = useState<string[]>([]);
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [filters, setFilters] = useState<Record<string, any>>(() => {
    const initialFilters: Record<string, any> = { page: '1' };
    searchParams.forEach((value, key) => {
      initialFilters[key] = value;
    });
    return initialFilters;
  });

  const currentPage = parseInt(filters.page || '1', 10);
  
  const fetchMessages = useCallback(async (page: number, currentFilters: Record<string, any>) => {
    if (!currentConfig) return;

    setLoading(true);
    setError(null);
    try {
        // Step 1: Base query for sessions matching text and date filters
        let baseQuery = supabase.from(currentConfig.tableName).select('session_id, created_at');

        currentConfig.filters.forEach(filterConfig => {
            const value = currentFilters[filterConfig.id];
            if (value && value !== 'all' && (filterConfig.type === 'text' || filterConfig.type === 'date')) {
                if (filterConfig.type === 'text') {
                    const column = filterConfig.id === 'q' ? 'message->>text' : filterConfig.id;
                    baseQuery = baseQuery.ilike(column, `%${value}%`);
                } else if (filterConfig.type === 'date') {
                    if (filterConfig.id.includes('from')) {
                        baseQuery = baseQuery.gte('created_at', new Date(value).toISOString());
                    } else if (filterConfig.id.includes('to')) {
                        const toDate = new Date(value);
                        toDate.setHours(23, 59, 59, 999);
                        baseQuery = baseQuery.lte('created_at', toDate.toISOString());
                    }
                }
            }
        });

        const { data: baseData, error: baseError } = await baseQuery;
        if (baseError) throw baseError;

        const sessionLastDates: Record<string, string> = {};
        (baseData || []).forEach(msg => {
            if (!sessionLastDates[msg.session_id] || new Date(msg.created_at) > new Date(sessionLastDates[msg.session_id])) {
                sessionLastDates[msg.session_id] = msg.created_at;
            }
        });
        let candidateSessionIds = Object.keys(sessionLastDates);

        // Step 2: Apply special select filter if present by filtering candidates
        const specialFilter = currentConfig.filters.find(f => f.type === 'select');
        const specialFilterValue = specialFilter ? currentFilters[specialFilter.id] : 'all';

        let finalSessionIds = candidateSessionIds;

        if (specialFilter && specialFilterValue && specialFilterValue !== 'all') {
            let positiveIdQuery = supabase.from(currentConfig.tableName).select('session_id');
            
            if (specialFilter.db_column_type === 'boolean' && specialFilter.db_column) {
                positiveIdQuery = positiveIdQuery.eq(specialFilter.db_column, true);
            } else if (specialFilter.db_column_type === 'text_match' && specialFilter.db_column && specialFilter.db_match_string) {
                positiveIdQuery = positiveIdQuery.ilike(specialFilter.db_column, `%${specialFilter.db_match_string}%`);
            }

            const { data: positiveData, error: positiveError } = await positiveIdQuery;
            if (positiveError) throw positiveError;
            
            const positiveIds = [...new Set((positiveData || []).map((p: any) => p.session_id))];

            if (specialFilterValue === 'requested') {
                finalSessionIds = candidateSessionIds.filter(id => positiveIds.includes(id));
            } else { // 'not_requested'
                finalSessionIds = candidateSessionIds.filter(id => !positiveIds.includes(id));
            }
        }
        
        // Step 3: Sort the final list of session IDs
        const sortedSessionIds = finalSessionIds.sort((a,b) => 
            new Date(sessionLastDates[b]).getTime() - new Date(sessionLastDates[a]).getTime()
        );
        
        setTotalCount(sortedSessionIds.length);
        
        // Step 4: Paginate
        const from = (page - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE;
        const paginatedSessionIds = sortedSessionIds.slice(from, to);

        if (paginatedSessionIds.length === 0) {
            setGroupedMessages({});
            setSessionOrder([]);
            setLoading(false);
            return;
        }

        // Step 5: Fetch all data for the paginated sessions
        const { data: finalData, error: finalError } = await supabase
            .from(currentConfig.tableName)
            .select('*')
            .in('session_id', paginatedSessionIds)
            .order('created_at', { ascending: true });
        
        if (finalError) throw finalError;

        const groups: Record<string, Message[]> = {};
        (finalData || []).forEach(msg => {
            if (!groups[msg.session_id]) groups[msg.session_id] = [];
            groups[msg.session_id].push(msg);
        });

        setGroupedMessages(groups);
        setSessionOrder(paginatedSessionIds);

    } catch (err: any) {
      setError(err?.message || String(err) || "An unexpected error occurred.");
      console.error("Error fetching messages:", err);
    } finally {
      setLoading(false);
    }
  }, [currentConfig]);

  useEffect(() => {
    fetchMessages(currentPage, filters);
  }, [currentPage, filters, fetchMessages]);

  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && (key !== 'page' || value !== '1')) {
        params.set(key, String(value));
      }
    });
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);
  
  const handleFilterChange = (id: string, value: any) => {
    setFilters(prev => ({ ...prev, [id]: value, page: '1' }));
    if(id === 'from' || id === 'to') setActivePreset(null);
  };

  const handlePresetSelect = (preset: '7d' | '30d' | '90d') => {
      const to = new Date();
      const from = new Date();
      if (preset === '7d') from.setDate(to.getDate() - 7);
      if (preset === '30d') from.setDate(to.getDate() - 30);
      if (preset === '90d') from.setDate(to.getDate() - 90);
      
      const fromString = from.toISOString().split('T')[0];
      const toString = to.toISOString().split('T')[0];
      
      setFilters(prev => ({ ...prev, from: fromString, to: toString, page: '1' }));
      setActivePreset(preset);
  }

  const handleFilterSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      fetchMessages(1, filters);
  };

  const handleExportCSV = async () => {
    if (!currentConfig) return;
    setIsExporting(true);
    try {
        let baseQuery = supabase.from(currentConfig.tableName).select('session_id, created_at');
        currentConfig.filters.forEach(filterConfig => {
            const value = filters[filterConfig.id];
            if (value && value !== 'all' && (filterConfig.type === 'text' || filterConfig.type === 'date')) {
                if (filterConfig.type === 'text') {
                    const column = filterConfig.id === 'q' ? 'message->>text' : filterConfig.id;
                    baseQuery = baseQuery.ilike(column, `%${value}%`);
                } else if (filterConfig.type === 'date') {
                    if (filterConfig.id.includes('from')) {
                        baseQuery = baseQuery.gte('created_at', new Date(value).toISOString());
                    } else if (filterConfig.id.includes('to')) {
                        const toDate = new Date(value);
                        toDate.setHours(23, 59, 59, 999);
                        baseQuery = baseQuery.lte('created_at', toDate.toISOString());
                    }
                }
            }
        });
        const { data: baseData, error: baseError } = await baseQuery;
        if (baseError) throw baseError;
        let candidateSessionIds = [...new Set((baseData || []).map(msg => msg.session_id))];

        const specialFilter = currentConfig.filters.find(f => f.type === 'select');
        const specialFilterValue = specialFilter ? filters[specialFilter.id] : 'all';
        let finalSessionIds = candidateSessionIds;
        if (specialFilter && specialFilterValue && specialFilterValue !== 'all') {
            let positiveIdQuery = supabase.from(currentConfig.tableName).select('session_id');
            if (specialFilter.db_column_type === 'boolean' && specialFilter.db_column) positiveIdQuery = positiveIdQuery.eq(specialFilter.db_column, true);
            else if (specialFilter.db_column_type === 'text_match' && specialFilter.db_column && specialFilter.db_match_string) positiveIdQuery = positiveIdQuery.ilike(specialFilter.db_column, `%${specialFilter.db_match_string}%`);
            const { data: positiveData, error: positiveError } = await positiveIdQuery;
            if (positiveError) throw positiveError;
            const positiveIds = [...new Set((positiveData || []).map((p: any) => p.session_id))];
            if (specialFilterValue === 'requested') finalSessionIds = candidateSessionIds.filter(id => positiveIds.includes(id));
            else finalSessionIds = candidateSessionIds.filter(id => !positiveIds.includes(id));
        }

        if (finalSessionIds.length === 0) {
            alert("No hay datos para exportar con los filtros seleccionados.");
            return;
        }

        const { data: allMessages, error: messagesError } = await supabase.from(currentConfig.tableName).select('*').in('session_id', finalSessionIds).order('created_at', { ascending: true });
        if (messagesError) throw messagesError;

        const headers = ['session_id', 'created_at', 'message_content'];
        const csvRows = [headers.join(',')];
        const escapeCSV = (str: string) => { if (str.includes(',') || str.includes('"') || str.includes('\n')) return `"${str.replace(/"/g, '""')}"`; return str; };
        (allMessages || []).forEach(msg => {
            const messageField = msg.message;
            const rawText = (typeof messageField === 'object' && messageField !== null && 'text' in messageField) ? String(messageField.text) : String(messageField);
            const row = [ escapeCSV(msg.session_id), escapeCSV(msg.created_at), escapeCSV(rawText.replace(/\n/g, ' ')), ];
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const date = new Date().toISOString().split('T')[0];
        link.setAttribute('download', `historial_chat_${date}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (err: any) {
        console.error("Error exporting CSV:", err);
        alert(`Error al exportar CSV: ${err.message}`);
    } finally {
        setIsExporting(false);
    }
  };
  
  const toggleSession = (sessionIdToToggle: string) => {
    setExpandedSessions(prev => ({ ...prev, [sessionIdToToggle]: !prev[sessionIdToToggle] }));
  };

  if (!currentConfig) {
      return <div className="text-center py-10 text-gray-400">Seleccione una tabla para comenzar...</div>;
  }
  
  const primaryColumn = currentConfig.columns.find(c => c.isPrimary) || currentConfig.columns[0];
  const otherColumns = currentConfig.columns.filter(c => !c.isPrimary);

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Historial de Chats</h1>

      <div className="bg-gray-800 p-4 rounded-lg shadow-md mb-6">
        <form onSubmit={handleFilterSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end">
            {currentConfig.filters.filter(f => f.type === 'text').map(filter => (
              <div key={filter.id}>
                 <input type="text" placeholder={filter.label} value={filters[filter.id] || ''} onChange={e => handleFilterChange(filter.id, e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            ))}
            {currentConfig.filters.filter(f => f.type === 'select').map(filter => (
              <div key={filter.id}>
                <select value={filters[filter.id] || 'all'} onChange={e => handleFilterChange(filter.id, e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 h-10">
                  <option value="all">{filter.label} (Todos)</option>
                  {filter.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
            ))}
            <div className="flex gap-2 col-span-full sm:col-span-1">
                <button type="submit" className="flex-grow px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-800 h-10">
                    Aplicar Filtros
                </button>
                <button 
                    type="button" 
                    onClick={handleExportCSV} 
                    disabled={isExporting}
                    className="flex-shrink-0 flex items-center justify-center p-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800 h-10 w-10 disabled:opacity-50 disabled:cursor-wait"
                    title="Descargar CSV"
                >
                    {isExporting ? 
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> :
                        <DownloadIcon className="w-5 h-5"/>
                    }
                </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end mt-4">
              <div>
                  <label className="text-xs text-gray-400">Desde</label>
                  <input type="date" value={filters['from'] || ''} onChange={e => handleFilterChange('from', e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                  <label className="text-xs text-gray-400">Hasta</label>
                  <input type="date" value={filters['to'] || ''} onChange={e => handleFilterChange('to', e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="sm:col-span-2">
                 <label className="text-xs text-gray-400 block mb-1">Rangos Rápidos</label>
                 <DatePresetPicker onSelect={handlePresetSelect} selected={activePreset} />
              </div>
          </div>
        </form>
      </div>

      <div className="bg-gray-800 rounded-lg shadow-md md:overflow-hidden">
        <div className="hidden md:block">
          <table className="w-full text-sm text-left text-gray-400">
            <thead className="text-xs text-gray-300 uppercase bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 w-1/2">{primaryColumn.header}</th>
                {otherColumns.map(col => <th key={col.id} scope="col" className={`px-6 py-3 ${col.className}`}>{col.header}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-gray-900">
              {loading ? (
                [...Array(PAGE_SIZE)].map((_, i) => (
                  <tr key={i}><td colSpan={currentConfig.columns.length}><div className="h-24 bg-gray-700 animate-pulse m-2 rounded"></div></td></tr>
                ))
              ) : error ? (
                  <tr><td colSpan={currentConfig.columns.length} className="text-center py-8 text-red-500">{error}</td></tr>
              ) : sessionOrder.length > 0 ? (
                sessionOrder.flatMap(sId => {
                  const sessionMessages = groupedMessages[sId];
                  if (!sessionMessages || sessionMessages.length === 0) return [];
                  
                  const isExpanded = !!expandedSessions[sId];
                  // Inject the full session messages into the first message for context
                  const firstMessage = { ...sessionMessages[0], _sessionMessages: sessionMessages };
                  
                  return [
                    <tr key={sId} className="hover:bg-gray-700/50">
                      <td className="px-6 py-2 align-top" onClick={() => toggleSession(sId)}>
                        <div className="flex items-start cursor-pointer">
                            <span className="mr-2 mt-1 flex-shrink-0 text-gray-400">
                                {isExpanded ? <ChevronDownIcon className="w-5 h-5"/> : <ChevronRightIcon className="w-5 h-5"/>}
                            </span>
                            <div className="flex-grow">{primaryColumn.render ? primaryColumn.render(primaryColumn.accessor(firstMessage), firstMessage) : primaryColumn.accessor(firstMessage)}</div>
                        </div>
                      </td>
                      {otherColumns.map(col => <td key={col.id} className={`px-6 py-4 align-top ${col.className}`}>{col.render ? col.render(col.accessor(firstMessage), firstMessage) : col.accessor(firstMessage)}</td>)}
                    </tr>,
                    isExpanded && sessionMessages.map(msg => (
                      <tr key={msg.id} className="bg-gray-800">
                        <td className="pl-16 pr-6 py-2" colSpan={currentConfig.columns.length}>
                          <div className="text-xs text-gray-500 mb-1">{new Date(msg.created_at).toLocaleString('es-ES')}</div>
                           {primaryColumn.render ? primaryColumn.render(primaryColumn.accessor(msg), msg) : primaryColumn.accessor(msg)}
                        </td>
                      </tr>
                    ))
                  ];
                })
              ) : (
                  <tr><td colSpan={currentConfig.columns.length} className="text-center py-8">No se encontraron mensajes con sus criterios.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Mobile View */}
        <div className="md:hidden">
            {loading ? (
                 [...Array(5)].map((_, i) => ( <div key={i} className="p-4 border-b border-gray-700"><div className="h-32 bg-gray-700 rounded animate-pulse"></div></div>))
            ) : error ? (
                <div className="p-4 text-center text-red-500">{error}</div>
            ) : sessionOrder.length > 0 ? (
                sessionOrder.map(sId => {
                    const sessionMessages = groupedMessages[sId];
                    if (!sessionMessages || sessionMessages.length === 0) return null;
                    const firstMessage = { ...sessionMessages[0], _sessionMessages: sessionMessages };
                     return (
                        <div key={sId} className="p-4 border-b border-gray-700">
                           <div onClick={() => toggleSession(sId)} className="flex items-start cursor-pointer">
                                <span className="mr-2 mt-1 flex-shrink-0 text-gray-400">
                                    {expandedSessions[sId] ? <ChevronDownIcon className="w-5 h-5"/> : <ChevronRightIcon className="w-5 h-5"/>}
                                </span>
                                <div className="w-full">
                                    {primaryColumn.render ? primaryColumn.render(primaryColumn.accessor(firstMessage), firstMessage) : primaryColumn.accessor(firstMessage)}
                                </div>
                           </div>
                           <div className="mt-3 pl-8 space-y-2 text-sm">
                               {otherColumns.map(col => (
                                   <div key={col.id} className="flex justify-between">
                                       <span className="font-semibold text-gray-300">{col.header}:</span>
                                       <span className="text-right text-gray-400">{col.render ? col.render(col.accessor(firstMessage), firstMessage) : col.accessor(firstMessage)}</span>
                                   </div>
                               ))}
                           </div>
                           {expandedSessions[sId] && (
                               <div className="pl-8 mt-4 space-y-3">
                                   {sessionMessages.map(msg => (
                                       <div key={msg.id} className="border-t border-gray-700 pt-3">
                                            <div className="text-xs text-gray-500 mb-1">{new Date(msg.created_at).toLocaleString('es-ES')}</div>
                                            {primaryColumn.render ? primaryColumn.render(primaryColumn.accessor(msg), msg) : primaryColumn.accessor(msg)}
                                       </div>
                                   ))}
                               </div>
                           )}
                        </div>
                     )
                })
            ) : (
                <div className="p-4 text-center">No se encontraron mensajes.</div>
            )}
        </div>
      </div>
      <Pagination currentPage={currentPage} totalCount={totalCount} pageSize={PAGE_SIZE} onPageChange={(p) => handleFilterChange('page', p)} />
    </div>
  );
};

export default HistoryPage;