import { Link, useLocation } from '@tanstack/react-router';
import { useAuth } from '@/hooks/use-auth';
import { Dumbbell, LogOut, Map, List } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Header() {
  const { user, signOut } = useAuth();
  const location = useLocation();

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto max-w-7xl flex items-center justify-between px-4 h-14">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Dumbbell className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-heading font-bold text-lg tracking-tight">AF Tracker</span>
          <span className="text-xs bg-af-orange/15 text-af-orange px-2 py-0.5 rounded-full font-medium">SG</span>
        </Link>

        <div className="flex items-center gap-1">
          {user && (
            <>
              <Link to="/map">
                <Button
                  variant={location.pathname === '/map' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="gap-1.5"
                >
                  <Map className="w-4 h-4" />
                  <span className="hidden sm:inline">Map</span>
                </Button>
              </Link>
              <Link to="/list">
                <Button
                  variant={location.pathname === '/list' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="gap-1.5"
                >
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">List</span>
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5 text-muted-foreground">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
