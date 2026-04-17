import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: "default" | "destructive";
}

export function StatsCard({ title, value, icon: Icon, variant = "default" }: StatsCardProps) {
  return (
    <Card
      className={cn(
        "transition-colors",
        variant === "destructive" && "border-destructive/50 bg-destructive/5 text-destructive hover:bg-destructive/10 dark:bg-destructive/10"
      )}
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
