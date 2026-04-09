import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { ClientSidebar } from './ClientSidebar';
import { ClientBottomNav } from './ClientBottomNav';
import { useRoleRedirect } from '@/hooks/useRoleRedirect';
import { useAuth } from '@/contexts/AuthContext';
import ClientSelectEstablishment from '@/pages/client/ClientSelectEstablishment';

const SELECTED_ESTABLISHMENT_KEY = 'client-selected-establishment';

export function ClientLayout() {
  const { loading } = useRoleRedirect();
  const { user } = useAuth();
  const [selectedEstablishment, setSelectedEstablishment] = useState<string | null>(() => {
    return localStorage.getItem(SELECTED_ESTABLISHMENT_KEY);
  });

  const handleSelectEstablishment = (id: string) => {
    localStorage.setItem(SELECTED_ESTABLISHMENT_KEY, id);
    setSelectedEstablishment(id);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!selectedEstablishment) {
    return <ClientSelectEstablishment onSelect={handleSelectEstablishment} />;
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar - desktop only */}
      <div className="hidden md:block">
        <ClientSidebar onChangeEstablishment={() => {
          localStorage.removeItem(SELECTED_ESTABLISHMENT_KEY);
          setSelectedEstablishment(null);
        }} />
      </div>
      <main className="flex-1 p-4 sm:p-6 overflow-auto pb-20 md:pb-6">
        <Outlet context={{ establishmentId: selectedEstablishment }} />
      </main>
      {/* Bottom Nav - mobile only */}
      <ClientBottomNav />
    </div>
  );
}
