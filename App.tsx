import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import HistoryPage from './pages/HistoryPage';
import AnalyticsPage from './pages/AnalyticsPage';
import { TableProvider } from './contexts/TableContext';

const DebugInfo: React.FC = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  return (
    <div style={{
      position: 'fixed', 
      top: '10px', 
      left: '10px', 
      zIndex: 9999, 
      backgroundColor: 'white', 
      padding: '10px', 
      border: '2px solid red',
      color: 'black'
    }}>
      <h3 style={{ fontWeight: 'bold', margin: 0 }}>Debug Info:</h3>
      <p>VITE_SUPABASE_URL: <strong>{supabaseUrl || 'NOT SET'}</strong></p>
      <p>VITE_SUPABASE_ANON_KEY: <strong>{supabaseKey ? 'SET' : 'NOT SET'}</strong></p>
    </div>
  );
};

const App: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  
  useEffect(() => {
    document.documentElement.classList.add('dark');
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const handleResize = () => setSidebarOpen(mediaQuery.matches);
    handleResize(); // Set initial state
    mediaQuery.addEventListener('change', handleResize);
    return () => mediaQuery.removeEventListener('change', handleResize);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  return (
    <TableProvider>
        <HashRouter>
          <div className="flex h-screen bg-gray-900 font-sans text-gray-100">
            <DebugInfo />
            {/* Backdrop for mobile */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/60 md:hidden"
                    onClick={toggleSidebar}
                />
            )}
            <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

            <div className="flex-1 flex flex-col overflow-hidden">
              <Header toggleSidebar={toggleSidebar} />

              <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-900">
                <div className="container mx-auto px-4 sm:px-6 py-8">
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/history" element={<HistoryPage />} />
                    <Route path="/analytics" element={<AnalyticsPage />} />
                  </Routes>
                </div>
              </main>
            </div>
          </div>
        </HashRouter>
    </TableProvider>
  );
};

export default App;