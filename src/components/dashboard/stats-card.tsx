import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: React.ReactNode;
  icon: LucideIcon;
  variant?: "default" | "destructive";
  onClick?: () => void;
}

export function StatsCard({ title, value, icon: Icon, variant = "default", onClick }: StatsCardProps) {
  const isClickable = !!onClick;
  
  return (
    <Card
      className={cn(
        "transition-all border-none shadow-sm bg-card",
        variant === "destructive" && "bg-destructive/10 text-destructive border border-destructive/20",
        isClickable && "cursor-pointer hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
      )}
      onClick={onClick}
      onKeyDown={isClickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div className="p-3 sm:p-4 flex items-center justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground truncate leading-none">
            {title}
          </p>
          <div className="text-xl sm:text-2xl font-bold leading-tight truncate">
            {value}
          </div>
        </div>
        <div className={cn(
            "p-2 rounded-lg bg-muted/50 shrink-0", 
            variant === "destructive" && "bg-destructive/20"
        )}>
          <Icon className={cn("h-4 w-4 text-muted-foreground", variant === "destructive" && "text-destructive")} />
        </div>
      </div>
    </Card>
  );
}
