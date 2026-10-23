import React, { useEffect, useRef } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  Music2,
  BookOpen,
  Tags,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Star,
  ListMusic,
  Settings,
} from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle.js';
import { cn } from '../../lib/utils.js';

export interface ApplicationSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const ApplicationSidebar: React.FC<ApplicationSidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const location = useLocation();

  // Safely close mobile drawer ONLY when route path actually changes
  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      onCloseMobile();
    }
  }, [location.pathname, onCloseMobile]);

  // Lock background body scrolling while mobile drawer is open
  useEffect(() => {
    if (isMobileOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isMobileOpen]);

  // Handle Escape key to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileOpen) {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, onCloseMobile]);

  const navItems = [
    {
      to: '/songs',
      label: 'All Songs',
      icon: <BookOpen className="w-5 h-5 shrink-0" />,
      exact: true,
    },
    {
      to: '/songs?filter=favorites',
      label: 'Favorites',
      icon: <Star className="w-5 h-5 shrink-0" />,
    },
    {
      to: '/setlists',
      label: 'Setlists',
      icon: <ListMusic className="w-5 h-5 shrink-0" />,
    },
    {
      to: '/labels',
      label: 'Labels',
      icon: <Tags className="w-5 h-5 shrink-0" />,
    },
    {
      to: '/songs/new',
      label: 'Add Song',
      icon: <PlusCircle className="w-5 h-5 shrink-0" />,
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5 shrink-0" />,
    },
  ];

  const getNavLinkClass = (isActive: boolean) =>
    cn(
      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative min-h-[44px]',
      isActive
        ? 'bg-[#E8F1E9] dark:bg-[#24372C] text-[#146C43] dark:text-[#F0F5F0] font-semibold shadow-2xs'
        : 'text-[#647067] dark:text-[#A8B9AE] hover:text-[#1C2924] dark:hover:text-[#F0F5F0] hover:bg-[#E8F1E9]/70 dark:hover:bg-[#24372C]/60'
    );

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between overflow-y-auto">
      {/* Top Header & Brand */}
      <div>
        <div className="h-16 flex items-center px-4 border-b border-[#E4E9E3] dark:border-[#2A4033] justify-between shrink-0">
          <Link
            to="/songs"
            onClick={onCloseMobile}
            className="flex items-center gap-3 overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#198754] rounded-lg"
          >
            <div className="w-9 h-9 rounded-xl bg-[#198754] flex items-center justify-center text-white shadow-md shadow-[#198754]/20 shrink-0">
              <Music2 className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-[#1C2924] dark:text-[#F0F5F0] tracking-tight text-base truncate">
                  WorshipFlow
                </span>
                <span className="text-[9px] uppercase font-bold tracking-wider text-[#198754] dark:text-[#6FCF97]">
                  One Flow • Live
                </span>
              </div>
            )}
          </Link>

          {/* Close button for mobile drawer */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden p-2 rounded-lg text-[#647067] hover:text-[#1C2924] dark:hover:text-[#F0F5F0] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] focus:outline-none focus:ring-2 focus:ring-[#198754] min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close navigation drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1.5" aria-label="Main Navigation">
          {navItems.map((item) => {
            const isFavoritesRoute = item.to === '/songs?filter=favorites';
            const isAllSongsRoute = item.to === '/songs';
            const hasFavoritesFilter = location.search.includes('filter=favorites');

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                onClick={onCloseMobile}
                className={({ isActive }) => {
                  let active = isActive;
                  if (isFavoritesRoute) {
                    active = location.pathname === '/songs' && hasFavoritesFilter;
                  } else if (isAllSongsRoute) {
                    active = location.pathname === '/songs' && !hasFavoritesFilter;
                  }
                  return getNavLinkClass(active);
                }}
                title={isCollapsed ? item.label : undefined}
              >
                {item.icon}
                {!isCollapsed && <span>{item.label}</span>}
                {isCollapsed && (
                  <span className="sr-only">{item.label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Footer & Controls */}
      <div className="p-3 border-t border-[#E4E9E3] dark:border-[#2A4033] space-y-2 shrink-0">
        {/* Theme Setting */}
        <div className={cn('flex items-center', isCollapsed ? 'justify-center' : 'justify-between px-1')}>
          {!isCollapsed && (
            <span className="text-xs font-medium text-[#647067] dark:text-[#A8B9AE]">
              Appearance
            </span>
          )}
          <ThemeToggle showLabel={!isCollapsed} />
        </div>

        {/* Collapse Toggle Button (Desktop only) */}
        <div className="hidden md:block pt-1">
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[#647067] dark:text-[#A8B9AE]',
              'hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] hover:text-[#1C2924] dark:hover:text-[#F0F5F0] transition-colors',
              isCollapsed && 'justify-center'
            )}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Collapse Sidebar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col fixed inset-y-0 left-0 z-30 transition-all duration-200 ease-in-out',
          'bg-white dark:bg-[#17251E] border-r border-[#E4E9E3] dark:border-[#2A4033] print:hidden',
          isCollapsed ? 'w-20' : 'w-64'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Out Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 dark:bg-black/75 backdrop-blur-xs transition-opacity print:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile Slide-Out Drawer */}
      <div
        id="mobile-navigation-drawer"
        className={cn(
          'md:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white dark:bg-[#17251E] shadow-2xl transition-transform duration-200 ease-in-out print:hidden flex flex-col h-full',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation drawer"
      >
        {sidebarContent}
      </div>
    </>
  );
};
