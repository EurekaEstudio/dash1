import React from 'react';
import { MenuIcon } from './icons';
import TableSelector from './TableSelector';

interface HeaderProps {
    toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
    return (
        <header className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-4">
                 <button onClick={toggleSidebar} className="p-2 text-gray-300 hover:text-white md:hidden">
                    <MenuIcon className="w-6 h-6" />
                </button>
                <TableSelector />
            </div>
            <div className="flex items-center">
                 {/* Placeholder for future header items like user profile */}
            </div>
        </header>
    );
};

export default Header;
