import { useEffect, useState } from 'react';
import { FilePlus2, LogOut, Search } from 'lucide-react';
import { AuthProvider, useAuth } from './lib/auth.jsx';
import Logo from './components/Logo.jsx';
import RepositorySearch from './components/RepositorySearch.jsx';
import StaffPortal from './components/StaffPortal.jsx';
import AdminApp from './admin/AdminApp.jsx';

/** Tiny hash router (no extra package): "#/admin" opens the administrator portal. */
function useHash() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}

function Router() {
  const hash = useHash();
  return hash.startsWith('#/admin') ? <AdminApp /> : <PublicSite />;
}

const TABS = [
  { id: 'search', label: 'Browse', long: 'Browse repository', icon: Search },
  { id: 'submit', label: 'Submit', long: 'Submit a publication', icon: FilePlus2 },
];

function PublicSite() {
  const [tab, setTab] = useState('search');
  const { staff, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-brand-light">
      <header className="border-b border-brand-primary/20 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Logo className="h-11 w-auto sm:h-14" />
            <h1 className="text-lg font-semibold leading-tight sm:text-2xl">Publication Repository</h1>
          </div>

          {staff && (
            <button className="inline-flex items-center gap-1 text-sm text-brand-ink/70 hover:text-brand-700" onClick={() => logout('staff')}>
              <LogOut size={14} aria-hidden /> Sign out
            </button>
          )}
        </div>

        <nav aria-label="Main" className="mx-auto grid max-w-6xl grid-cols-2 gap-1 px-4 pb-3 sm:flex">
          {TABS.map(({ id, label, long, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={tab === id ? 'page' : undefined}
              className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium sm:min-h-0 ${
                tab === id ? 'bg-brand-primary text-white' : 'text-brand-ink hover:bg-brand-light'
              }`}
            >
              <Icon size={16} aria-hidden />
              <span className="sm:hidden">{label}</span>
              <span className="hidden sm:inline">{long}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
        {tab === 'search' ? <RepositorySearch /> : <StaffPortal />}
      </main>

      <footer className="border-t border-brand-primary/20 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-4 py-4 text-sm text-brand-ink/70">
          <Logo className="h-8 w-auto" />
          <span>Publication Repository</span>
        </div>
      </footer>
    </div>
  );
}