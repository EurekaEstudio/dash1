import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Message } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import StatCard from '../components/StatCard';
import { useTable } from '../contexts/TableContext';
import DatePresetPicker from '../components/DatePresetPicker';

const AnalyticsPage: React.FC = () => {
  const { currentConfig } = useTable();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({ totalSessions: 0, totalMessages: 0, positiveSessions: 0 });
  
  const defaultDateFrom = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  };
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [activePreset, setActivePreset] = useState<string | null>('30d');


  const fetchData = useCallback(async () => {
    if(!currentConfig) return;
    setLoading(true);
    let query = supabase
      .from(currentConfig.tableName)
      .select(`created_at, session_id, message, ${currentConfig.analytics.sessionAnalysis.filterColumn}`);

    if (dateFrom) {
      query = query.gte('created_at', new Date(dateFrom).toISOString());
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      query = query.lte('created_at', toDate.toISOString());
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching analytics data:', error);
      setMessages([]);
    } else {
      setMessages(data);
      
      const groups: Record<string, Message[]> = {};
      data.forEach(msg => {
        if (!groups[msg.session_id]) groups[msg.session_id] = [];
        groups[msg.session_id].push(msg);
      });

      let positiveSessionsCount = 0;
      Object.values(groups).forEach(sessionMessages => {
         if (currentConfig.analytics.sessionAnalysis.isPositive(sessionMessages)) {
             positiveSessionsCount++;
         }
      });
      
      setStats({
          totalSessions: Object.keys(groups).length,
          totalMessages: data.length,
          positiveSessions: positiveSessionsCount,
      });
    }
    setLoading(false);
  }, [dateFrom, dateTo, currentConfig]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sessionsByDay = useMemo(() => {
    if (!messages || messages.length === 0 || !currentConfig) return [];
    
    const sessions: Record<string, { date: string; isPositive: boolean; }> = {};
    messages.forEach(msg => {
        const sessionId = msg.session_id;
        if (!sessions[sessionId]) {
            sessions[sessionId] = {
                date: new Date(msg.created_at).toISOString().split('T')[0],
                isPositive: false,
            };
        }
    });

    const groupedSessionMsgs: Record<string, Message[]> = {};
    messages.forEach(msg => {
        if(!groupedSessionMsgs[msg.session_id]) groupedSessionMsgs[msg.session_id] = [];
        groupedSessionMsgs[msg.session_id].push(msg);
    });

    Object.keys(sessions).forEach(sessionId => {
        sessions[sessionId].isPositive = currentConfig.analytics.sessionAnalysis.isPositive(groupedSessionMsgs[sessionId]);
    });

    const dailyData: Record<string, { date: string; positive: number; negative: number; }> = {};
    Object.values(sessions).forEach(session => {
        const dateKey = session.date;
        if (!dailyData[dateKey]) {
            dailyData[dateKey] = { date: dateKey, positive: 0, negative: 0 };
        }
        if (session.isPositive) {
            dailyData[dateKey].positive++;
        } else {
            dailyData[dateKey].negative++;
        }
    });

    return Object.values(dailyData).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [messages, currentConfig]);

  const pieData = useMemo(() => {
    if (!currentConfig) return [];
    const sessionsWithout = stats.totalSessions - stats.positiveSessions;
    return [
      { name: currentConfig.analytics.sessionAnalysis.legend.positive, value: stats.positiveSessions },
      { name: currentConfig.analytics.sessionAnalysis.legend.negative, value: sessionsWithout },
    ];
  }, [stats, currentConfig]);
  
  const COLORS = currentConfig ? [currentConfig.analytics.sessionAnalysis.colors.positive, currentConfig.analytics.sessionAnalysis.colors.negative] : ['#10B981', '#3B82F6'];

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }: any) => {
    if (value === 0) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="14" fontWeight="bold">
            {value}
        </text>
    );
  };
  
  const handleDateChange = (field: 'from' | 'to', value: string) => {
      if (field === 'from') setDateFrom(value);
      if (field === 'to') setDateTo(value);
      setActivePreset(null);
  }

  const handlePresetSelect = (preset: '7d' | '30d' | '90d') => {
      const to = new Date();
      const from = new Date();
      if (preset === '7d') from.setDate(to.getDate() - 7);
      if (preset === '30d') from.setDate(to.getDate() - 30);
      if (preset === '90d') from.setDate(to.getDate() - 90);
      
      setDateFrom(from.toISOString().split('T')[0]);
      setDateTo(to.toISOString().split('T')[0]);
      setActivePreset(preset);
  }

  const handleFilterSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      fetchData();
  };
  
  if (!currentConfig) {
      return <div className="text-center py-10 text-gray-400">Seleccione una tabla para comenzar...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Analíticas</h1>

      <div className="bg-gray-800 p-4 rounded-lg shadow-md mb-6">
        <form onSubmit={handleFilterSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div>
                    <label className="text-xs text-gray-400">Desde</label>
                    <input type="date" value={dateFrom} onChange={e => handleDateChange('from', e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                    <label className="text-xs text-gray-400">Hasta</label>
                    <input type="date" value={dateTo} onChange={e => handleDateChange('to', e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div className="sm:col-span-1 lg:col-span-2">
                    <label className="text-xs text-gray-400 block mb-1">Rangos Rápidos</label>
                    <DatePresetPicker onSelect={handlePresetSelect} selected={activePreset} />
                </div>
            </div>
             <button type="submit" className="mt-4 px-4 py-2 w-full sm:w-auto bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-800 h-10">Aplicar Filtros</button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Sesiones Totales" value={stats.totalSessions} icon={currentConfig.stats[1].icon} loading={loading} />
        <StatCard title="Mensajes Totales" value={stats.totalMessages} icon={currentConfig.stats[0].icon} loading={loading} />
        <StatCard title={currentConfig.analytics.sessionAnalysis.legend.positive} value={stats.positiveSessions} icon={currentConfig.stats[2]?.icon || <div/>} loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-white mb-4">Sesiones por Día</h2>
          <ResponsiveContainer width="100%" height={300}>
            {loading ? (
                <div className="w-full h-full bg-gray-700 rounded-md animate-pulse"></div>
            ) : (
                <BarChart data={sessionsByDay}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                    <XAxis dataKey="date" fontSize={12} tick={{ fill: '#9CA3AF' }} tickFormatter={(tick) => new Date(tick + 'T00:00:00').toLocaleDateString('es-ES', {month:'short', day:'numeric'})} />
                    <YAxis fontSize={12} tick={{ fill: '#9CA3AF' }} allowDecimals={false} />
                    <Tooltip contentStyle={{backgroundColor: 'rgba(31, 41, 55, 0.8)', border: 'none', borderRadius: '0.5rem'}} labelStyle={{color: '#fff'}} itemStyle={{color:'#ddd'}}/>
                    <Legend wrapperStyle={{color: '#ddd'}}/>
                    <Bar dataKey="negative" stackId="a" name={currentConfig.analytics.sessionAnalysis.legend.negative} fill={currentConfig.analytics.sessionAnalysis.colors.negative} />
                    <Bar dataKey="positive" stackId="a" name={currentConfig.analytics.sessionAnalysis.legend.positive} fill={currentConfig.analytics.sessionAnalysis.colors.positive} />
                </BarChart>
            )}
          </ResponsiveContainer>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-white mb-4 text-center">Distribución de Sesiones</h2>
          <ResponsiveContainer width="100%" height={300}>
             {loading ? (
                <div className="w-full h-full bg-gray-700 rounded-md animate-pulse"></div>
            ) : (
                <PieChart>
                    <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={110}
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={{backgroundColor: 'rgba(31, 41, 55, 0.8)', border: 'none', borderRadius: '0.5rem'}} labelStyle={{color: '#fff'}} itemStyle={{color:'#ddd'}}/>
                    <Legend wrapperStyle={{color: '#ddd'}}/>
                </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

export default AnalyticsPage;