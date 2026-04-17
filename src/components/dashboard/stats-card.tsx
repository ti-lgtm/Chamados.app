import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        "transition-all",
        variant === "destructive" && "border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/10 dark:bg-destructive/10",
        isClickable && "cursor-pointer hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn("h-4 w-4 text-muted-foreground", variant === "destructive" && "text-destructive")} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
