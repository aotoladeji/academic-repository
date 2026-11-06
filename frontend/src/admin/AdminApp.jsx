import { useState } from 'react';
import { FileText, Inbox, Loader2, LogIn, LogOut, Mail, SlidersHorizontal, Users, ClipboardCheck } from 'lucide-react';
import { errorMessage } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { navigate } from '../App.jsx';
import Logo from '../components/Logo.jsx';
import AdminFormManager from '../components/AdminFormManager.jsx';
import StaffManager from './StaffManager.jsx';
import AccountRequests from './AccountRequests.jsx';
import PublicationsManager from './PublicationsManager.jsx';
import MailCenter from './MailCenter.jsx';
import EvidenceFinder from './EvidenceFinder.jsx';

const TABS = [
  { id: 'staff', label: 'Staff', icon: Users, view: StaffManager },
  { id: 'requests', label: 'Account requests', icon: Inbox, view: AccountRequests },
  { id: 'pubs', label: 'Publications', icon: FileText, view: PublicationsManager },
  { id: 'mail', label: 'Send email', icon: Mail, view: MailCenter },
    { id: 'evidence', label: 'Evidence finder', icon: ClipboardCheck, view: EvidenceFinder },
  { id: 'form', label: 'Form builder', icon: SlidersHorizontal, view: AdminFormManager },
];

export default function AdminApp() {
  const { admin, ready } = useAuth();
  if (!ready) return <p className="p-8 text-sm">Loading…</p>;
  return admin ? <Dashboard /> : <AdminLogin />;
}

function AdminLogin() {
  const { adminLogin } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [state, setState] = useState({ loading: false, error: '' });

  const submit = async (e) => {
    e.preventDefault();
    setState({ loading: true, error: '' });
    try {
      await adminLogin(username.trim(), password);
    } catch (err) {
      setState({ loading: false, error: errorMessage(err, 'Sign-in failed.') });
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-brand-light p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
        <div className="text-center">
          <Logo className="mx-auto mb-3 h-20 w-auto" />
          <h1 className="text-xl font-semibold">Administrator sign in</h1>
        </div>
        {state.error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}
        <div>
          <label htmlFor="ad-username" className="label">Username</label>
          <input id="ad-username" type="text" className="input" required autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div>
          <label htmlFor="ad-pw" className="label">Password</label>
          <input id="ad-pw" type="password" className="input" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn-primary w-full" disabled={state.loading}>
          {state.loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />} Sign in
        </button>
        <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} className="block text-center text-sm text-brand-700 hover:underline">← Back to the public site</a>
      </form>
    </div>
  );
}

function Dashboard() {
  const { admin, logout } = useAuth();
  const [tab, setTab] = useState('staff');
  const Active = TABS.find((t) => t.id === tab).view;

  return (
    <div className="min-h-screen bg-brand-light">
      <header className="border-b border-brand-primary/20 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Logo className="h-10 w-auto sm:h-12" />
            <h1 className="text-base font-semibold leading-tight sm:text-xl">Repository administration</h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-brand-ink/70 md:inline">{admin.email}</span>
            <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} className="hidden font-medium text-brand-700 hover:underline sm:inline">Public site</a>
            <button className="btn-ghost" onClick={() => logout('admin')} aria-label="Sign out">
              <LogOut size={14} /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>

        {/* On phones the tabs scroll sideways instead of wrapping */}
        <nav aria-label="Admin sections" className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={tab === id ? 'page' : undefined}
              className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2.5 text-sm font-medium sm:py-2 ${
                tab === id ? 'bg-brand-primary text-white' : 'hover:bg-brand-light'
              }`}
            >
              <Icon size={16} aria-hidden /> {label}
            </button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8"><Active /></main>
    </div>
  );
}