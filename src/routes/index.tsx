import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { Dumbbell, MapPin, BarChart3, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/map" });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] px-4">
      <div className="max-w-lg text-center space-y-8">
        {/* Logo */}
        <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-af-purple-light flex items-center justify-center shadow-lg shadow-primary/25">
          <Dumbbell className="w-10 h-10 text-primary-foreground" />
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            AF <span className="text-primary">Tracker</span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Track every Anytime Fitness outlet you've visited in Singapore.
            Map your progress. Collect them all.
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3">
          {[
            { icon: MapPin, label: "Interactive Map" },
            { icon: BarChart3, label: "Track Progress" },
            { icon: Dumbbell, label: "40+ Outlets" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2 text-sm">
              <Icon className="w-4 h-4 text-af-orange" />
              <span>{label}</span>
            </div>
          ))}
        </div>

        <Link to="/login">
          <Button size="lg" className="gap-2 text-base px-8 mt-2">
            Get Started
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
