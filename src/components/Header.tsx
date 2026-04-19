import { Link, useLocation } from '@tanstack/react-router';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { LogOut, Map, List, LogIn, Sun, Moon } from 'lucide-react';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function Header() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const path = location.pathname;
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  return (
    <header className="header-root sticky top-0 z-50">
      {/* glass pane */}
      <div className="header-glass" />
      {/* bottom gradient divider */}
      <div className="header-divider" />

      <div className="mx-auto max-w-7xl flex items-center justify-between px-4 h-[3.75rem] relative">
        {/* ── Logo ── */}
        <Link to="/" className="flex items-center gap-2.5 group select-none">
          <img
            src="/af-logo.png"
            alt="Anytime Fitness"
            className="h-8 w-auto object-contain"
            style={{ filter: 'brightness(1.05)' }}
          />
          <span className="text-sm font-bold tracking-tight text-foreground">AF Tracker</span>
          <span className="badge-sg">SG</span>
        </Link>

        {/* ── Nav ── */}
        <nav className="flex items-center gap-1">
          <NavLink to="/" active={path === '/'} icon={<Map className="w-4 h-4" />} label="Map" />
          <NavLink to="/list" active={path === '/list'} icon={<List className="w-4 h-4" />} label="List" />

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="nav-btn nav-btn-ghost"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark'
              ? <Sun className="w-4 h-4" />
              : <Moon className="w-4 h-4" />
            }
          </button>

          {user ? (
            <>
              <button
                type="button"
                onClick={() => setShowLogoutDialog(true)}
                className="nav-btn nav-btn-ghost gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>

              <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Log out?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your visit progress is saved. You can sign back in anytime.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={signOut}>Log out</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <Link to="/login" className="nav-btn nav-btn-cta gap-1.5">
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Sign in</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

function NavLink({
  to,
  active,
  icon,
  label,
}: {
  to: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link to={to} className={`nav-btn ${active ? 'nav-btn-active' : 'nav-btn-ghost'} gap-1.5`}>
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
