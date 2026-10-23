import React, { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, WifiOff } from 'lucide-react';
import { ApplicationSidebar } from '../components/layout/ApplicationSidebar.js';
import { ThemeToggle } from '../components/ui/ThemeToggle.js';
import { useOfflineSync } from '../lib/offline/useOfflineSync.js';
import { cn } from '../lib/utils.js';

export const RootLayout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { isOffline, stats } = useOfflineSync();

  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const handleOpenMobile = useCallback(() => {
    setIsMobileOpen(true);
  }, []);

  const handleCloseMobile = useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  return (
    <div className="min-h-screen w-full max-w-full bg-[#FAFAF6] dark:bg-[#101A16] flex text-[#1C2924] dark:text-[#F0F5F0] overflow-x-hidden">
      <ApplicationSidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        isMobileOpen={isMobileOpen}
        onCloseMobile={handleCloseMobile}
      />

      <div
        className={cn(
          'flex-1 flex flex-col min-h-screen min-w-0 w-full max-w-full transition-all duration-200',
          isCollapsed ? 'md:ml-20' : 'md:ml-64'
        )}
      >
        {/* Application Header */}
        <header className="sticky top-0 z-20 h-16 w-full flex items-center justify-between px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#17251E] border-b border-[#E4E9E3] dark:border-[#2A4033] shadow-xs print:hidden">
          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={handleOpenMobile}
            aria-expanded={isMobileOpen}
            aria-controls="mobile-navigation-drawer"
            className="md:hidden p-2 rounded-lg text-[#647067] dark:text-[#A8B9AE] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] hover:text-[#1C2924] dark:hover:text-[#F0F5F0] focus:outline-none focus:ring-2 focus:ring-[#198754]"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Offline/Online status pill */}
          <div className="flex items-center gap-2">
            {isOffline ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline Mode ({stats.songCount} songs cached)</span>
              </span>
            ) : null}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 ml-auto">
            <ThemeToggle />
          </div>
        </header>

        {/* Main content - Full width responsive container */}
        <main className="flex-1 w-full max-w-full p-4 sm:p-6 lg:p-8 print:p-0 print:m-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
