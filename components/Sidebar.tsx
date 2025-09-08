import React from 'react';
import { NavLink } from 'react-router-dom';
import { DashboardIcon, HistoryIcon, AnalyticsIcon, XIcon, ChatBubbleIcon } from './icons';

interface SidebarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isSidebarOpen, toggleSidebar }) => {
  const commonLinkClasses = "flex items-center px-4 py-2 text-gray-200 rounded-md transition-colors duration-200";
  const activeLinkClasses = "bg-primary-500 text-white";
  const inactiveLinkClasses = "hover:bg-gray-700";
  
  const desktopClasses = `md:relative md:flex md:flex-col md:justify-between md:transition-all md:duration-300 ${isSidebarOpen ? 'md:w-64' : 'md:w-20'}`;
  const mobileClasses = `fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`;

  return (
    <aside className={`bg-gray-800 border-r border-gray-700 p-4 ${mobileClasses} ${desktopClasses} flex flex-col justify-between`}>
      <div>
        <div className="flex items-center justify-between mb-10 h-16">
           <div className="flex items-center justify-center flex-grow">
             {isSidebarOpen ? (
              <img src="https://eurekaestudiocreativo.com/wp-content/uploads/2023/09/PNG-EUREKA.png" alt="Eureka Logo" className="h-16 w-auto transition-all duration-300" style={{filter: 'brightness(0) invert(1)'}} />
            ) : (
              <div className="text-primary-400 hidden md:block">
                 <ChatBubbleIcon className="w-8 h-8"/>
              </div>
            )}
           </div>
           <button onClick={toggleSidebar} className="md:hidden p-1 -mr-2 text-gray-400 hover:text-white">
              <XIcon className="w-6 h-6"/>
           </button>
        </div>
        <nav>
          <NavLink to="/dashboard" className={({ isActive }) => `${commonLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}>
            <DashboardIcon className="w-6 h-6 flex-shrink-0" />
            {isSidebarOpen && <span className="mx-4 font-medium">Panel</span>}
          </NavLink>
          <NavLink to="/history" className={({ isActive }) => `${commonLinkClasses} mt-4 ${isActive ? activeLinkClasses : inactiveLinkClasses}`}>
            <HistoryIcon className="w-6 h-6 flex-shrink-0" />
            {isSidebarOpen && <span className="mx-4 font-medium">Historial</span>}
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => `${commonLinkClasses} mt-4 ${isActive ? activeLinkClasses : inactiveLinkClasses}`}>
            <AnalyticsIcon className="w-6 h-6 flex-shrink-0" />
            {isSidebarOpen && <span className="mx-4 font-medium">Analíticas</span>}
          </NavLink>
        </nav>
      </div>
      <div className="hidden md:flex items-center justify-center p-2">
        {/* Placeholder for potential footer items */}
      </div>
    </aside>
  );
};

export default Sidebar;