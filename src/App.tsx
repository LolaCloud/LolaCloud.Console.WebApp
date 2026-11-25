import React, { useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { applyMode, Mode } from '@cloudscape-design/global-styles';
import { Login } from './pages/Login';
import { HomeDashboard } from './pages/HomeDashboard';
import { NavigationHeader } from './components/NavigationHeader';
import { LciModule } from './modules/lci/LciModule';
import { RunwayModule } from './modules/runway/RunwayModule';
import { RunwayZoneDnsDetailView } from './modules/runway/views/RunwayZoneDnsDetailView';
import { RelateModule } from './modules/relate/RelateModule';
import { StoreModule } from './modules/store/StoreModule';
import { JournalModule } from './modules/journal/JournalModule';
import { authService, type OperatorIdentity } from './services/api';

// Initialize theme on application startup: default to Dark Mode
const initialTheme = (localStorage.getItem('lola_theme') as 'dark' | 'light') || 'dark';
applyMode(initialTheme === 'dark' ? Mode.Dark : Mode.Light);

interface ProtectedRouteProps {
  operator: OperatorIdentity | null;
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ operator, children }) => {
  const isAuth = Boolean(operator || (authService.isAuthenticated() && authService.getCurrentOperator()));
  const location = useLocation();

  if (!isAuth) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

interface AuthenticatedLayoutProps {
  operator: OperatorIdentity;
  onLogout: () => Promise<void>;
}

const AuthenticatedLayout: React.FC<AuthenticatedLayoutProps> = ({
  operator,
  onLogout,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const activeServiceKey = location.pathname.startsWith('/lci')
    ? 'lci'
    : location.pathname.startsWith('/runway')
    ? 'runway'
    : location.pathname.startsWith('/relate')
    ? 'relate'
    : location.pathname.startsWith('/store')
    ? 'store'
    : location.pathname.startsWith('/journal')
    ? 'journal'
    : null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div id="top-navigation" style={{ position: 'sticky', top: 0, zIndex: 1002 }}>
        <NavigationHeader
          operator={operator}
          activeServiceKey={activeServiceKey}
          onSelectService={(serviceKey) => {
            if (serviceKey === 'lci') {
              navigate('/lci/dashboard');
            } else if (serviceKey === 'runway') {
              navigate('/runway/dashboard');
            } else if (serviceKey === 'relate') {
              navigate('/relate/dashboard');
            } else if (serviceKey === 'store') {
              navigate('/store/dashboard');
            } else if (serviceKey === 'journal') {
              navigate('/journal/dashboard');
            }
          }}
          onGoHome={() => navigate('/')}
          onLogout={onLogout}
        />
      </div>

      <Outlet />
    </div>
  );
};

const AppRoutes: React.FC = () => {
  const [operator, setOperator] = useState<OperatorIdentity | null>(() => {
    return authService.getCurrentOperator();
  });
  const navigate = useNavigate();

  // Backward compatibility: migrate legacy hash routes to clean path URLs
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      const hashToPath: Record<string, string> = {
        lci: '/lci/dashboard',
        dashboard: '/lci/dashboard',
        operators: '/lci/operators',
        'create-operator': '/lci/operators/create',
        permissions: '/lci/rbac-policies',
        runway: '/runway/dashboard',
        'runway-tunnels': '/runway/tunnels',
        'runway-accounts': '/runway/accounts',
        'runway-dns': '/runway/dns',
        relate: '/relate/dashboard',
        'relate-instances': '/relate/instances',
        'relate-backups': '/relate/backups',
        'relate-routing': '/relate/routing',
        store: '/store/dashboard',
        'store-buckets': '/store/buckets',
        journal: '/journal/dashboard',
        'journal-groups': '/journal/groups',
        'journal-tail': '/journal/live-tail',
        'journal-metrics': '/journal/metrics',
      };
      if (hashToPath[hash]) {
        window.history.replaceState(null, '', hashToPath[hash]);
        navigate(hashToPath[hash], { replace: true });
      }
    }
  }, [navigate]);

  // Listen for global 401 unauthorized events to immediately reset session state
  useEffect(() => {
    const onUnauthorized = () => {
      setOperator(null);
    };
    window.addEventListener('lola-auth-unauthorized', onUnauthorized);
    return () => {
      window.removeEventListener('lola-auth-unauthorized', onUnauthorized);
    };
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    setOperator(null);
    navigate('/login');
  };

  const currentOperator = operator || authService.getCurrentOperator();

  return (
    <Routes>
      {/* Public Route: Login */}
      <Route
        path="/login"
        element={
          currentOperator ? (
            <Navigate to="/" replace />
          ) : (
            <Login
              onLoginSuccess={(op) => {
                setOperator(op);
                navigate('/');
              }}
            />
          )
        }
      />

      {/* Authenticated Layout (protected with auth guard) */}
      <Route
        element={
          <ProtectedRoute operator={currentOperator}>
            <AuthenticatedLayout
              operator={currentOperator!}
              onLogout={handleLogout}
            />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<HomeDashboard operator={currentOperator!} />} />
        <Route path="/lci" element={<Navigate to="/lci/dashboard" replace />} />
        <Route path="/lci/*" element={<LciModule operator={currentOperator!} />} />
        <Route path="/runway" element={<Navigate to="/runway/dashboard" replace />} />
        <Route path="/runway/dns/zones/:zoneId" element={<RunwayZoneDnsDetailView />} />
        <Route path="/runway/*" element={<RunwayModule operator={currentOperator!} />} />
        <Route path="/relate" element={<Navigate to="/relate/dashboard" replace />} />
        <Route path="/relate/*" element={<RelateModule operator={currentOperator!} />} />
        <Route path="/store" element={<Navigate to="/store/dashboard" replace />} />
        <Route path="/store/*" element={<StoreModule operator={currentOperator!} />} />
        <Route path="/journal" element={<Navigate to="/journal/dashboard" replace />} />
        <Route path="/journal/*" element={<JournalModule operator={currentOperator!} />} />
      </Route>

      {/* Fallback Route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
};

export default App;
