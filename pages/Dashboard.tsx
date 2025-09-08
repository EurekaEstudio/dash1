import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { SessionSummary, Message, StatCardProps } from '../types';
import StatCard from '../components/StatCard';
import { Link } from 'react-router-dom';
import { useTable } from '../contexts/TableContext';

const Dashboard: React.FC = () => {
  const { currentConfig } = useTable();
  const [data, setData] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<Record<string, Message[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentConfig) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from(currentConfig.tableName)
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        setData(data || []);

        const sessionGroups: Record<string, Message[]> = {};
        (data || []).forEach(msg => {
            if (!sessionGroups[msg.session_id]) {
                sessionGroups[msg.session_id] = [];
            }
            sessionGroups[msg.session_id].push(msg);
        });
        setSessions(sessionGroups);

      } catch (error) {
        console.error(`Error fetching data from ${currentConfig.tableName}:`, error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentConfig]);
  
  const recentSessions: SessionSummary[] = useMemo(() => {
    return Object.entries(sessions)
      .map(([session_id, messages]) => ({
        session_id,
        message_count: messages.length,
        last_message_at: messages[0].created_at, // Assumes descending order
      }))
      .sort((a,b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
      .slice(0, 5);
  }, [sessions]);


  const statCards: StatCardProps[] = useMemo(() => {
    if (!currentConfig) return [];
    return currentConfig.stats.map(statConfig => ({
        title: statConfig.title,
        value: loading ? 0 : statConfig.getValue(data, sessions),
        icon: statConfig.icon,
        loading: loading
    }));
  }, [currentConfig, data, sessions, loading]);

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Panel de Control</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {currentConfig ? (
          statCards.map(card => <StatCard key={card.title} {...card} />)
        ) : (
          [...Array(3)].map((_, i) => <StatCard key={i} title="" value="" icon={<div/>} loading={true} />)
        )}
      </div>

      <h2 className="text-2xl font-bold text-white mb-4">Sesiones de Chat Recientes</h2>
      <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden">
        {loading ? (
            <div className="p-6">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 bg-gray-700 rounded-md animate-pulse mb-2"></div>
                ))}
            </div>
        ) : recentSessions.length > 0 ? (
          <div className="divide-y divide-gray-700">
            {recentSessions.map(session => (
              <Link to={`/history?session_id=${session.session_id}`} key={session.session_id} className="p-4 flex flex-col gap-2 sm:flex-row justify-between sm:items-center hover:bg-gray-700/50 transition-colors duration-200">
                <div className="text-center sm:text-left">
                  <p className="font-mono text-sm text-primary-400 truncate" title={session.session_id}>{session.session_id}</p>
                  <p className="text-xs text-gray-400">{session.message_count} mensajes</p>
                </div>
                <div className="text-center sm:text-right">
                    <p className="text-sm font-medium text-gray-200">{new Date(session.last_message_at).toLocaleDateString('es-ES')}</p>
                    <p className="text-xs text-gray-400">{new Date(session.last_message_at).toLocaleTimeString('es-ES')}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="p-6 text-center text-gray-400">No se encontraron sesiones recientes.</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;