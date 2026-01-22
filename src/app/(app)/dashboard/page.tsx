"use client";

import { useAuth } from "@/hooks/useAuth";
import { UserDashboard } from "@/components/dashboard/user-dashboard";
import { TiDashboard } from "@/components/dashboard/ti-dashboard";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }
  
  const renderDashboard = () => {
    switch (user.role) {
      case 'user':
        return <UserDashboard user={user} />;
      case 'ti':
        return <TiDashboard user={user} />;
      case 'admin':
        return <AdminDashboard user={user} />;
      default:
        return <div>Papel de usuário desconhecido.</div>;
    }
  };

  return (
    <div className="w-full">
        {renderDashboard()}
    </div>
    );
}
