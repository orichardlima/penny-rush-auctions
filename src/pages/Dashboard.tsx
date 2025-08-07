import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import UserDashboard from '@/components/UserDashboard';
import AdminDashboard from '@/components/AdminDashboard';

const Dashboard = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  console.log('🔄 Dashboard render:', { 
    user: !!user, 
    userId: user?.id,
    profile: !!profile, 
    profileAdmin: profile?.is_admin,
    loading 
  });

  useEffect(() => {
    console.log('🔍 Dashboard useEffect:', { loading, user: !!user });
    if (!loading && !user) {
      console.log('❌ Redirecionando para /auth - usuário não logado');
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Loading state
  if (loading) {
    console.log('⏳ Dashboard: Loading...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando painel...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    console.log('❌ Dashboard: Usuário não autenticado');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecionando para login...</p>
        </div>
      </div>
    );
  }

  // No profile yet
  if (!profile) {
    console.log('⚠️ Dashboard: Profile não carregado');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando perfil do usuário...</p>
        </div>
      </div>
    );
  }

  console.log('✅ Dashboard: Renderizando dashboard para:', !!profile.is_admin ? 'Admin' : 'User');
  console.log('📊 Dashboard: Profile data:', { 
    is_admin: profile.is_admin, 
    email: profile.email, 
    full_name: profile.full_name,
    id: profile.id,
    user_id: profile.user_id
  });
  
  return !!profile.is_admin ? <AdminDashboard /> : <UserDashboard />;
};

export default Dashboard;