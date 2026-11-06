import { useState } from 'react';
import { Loader2, LogIn } from 'lucide-react';
import { errorMessage } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import AccountRequestForm from './AccountRequestForm.jsx';
import Logo from './Logo.jsx';

export default function StaffLogin() {
  const { staffLogin } = useAuth();
  const [mode, setMode] = useState('login'); // login | request
  const [pf, setPf] = useState('');
  const [password, setPassword] = useState('');
  const [state, setState] = useState({ loading: false, error: '' });

  if (mode === 'request') return <AccountRequestForm onBack={() => setMode('login')} />;

  const submit = async (e) => {
    e.preventDefault();
    setState({ loading: true, error: '' });
    try {
      await staffLogin(pf.trim(), password);
    } catch (err) {
      setState({ loading: false, error: errorMessage(err, 'Sign-in failed.') });
    }
  };

  return (
        <div className="card mx-auto max-w-md p-6">
      <h2 className="text-center text-2xl font-semibold">Staff sign in</h2>
      <p className="mb-4 mt-1 text-sm text-brand-ink/70">Sign in with your PF number to submit a publication.</p>
      {state.error && <p role="alert" className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="li-pf" className="label">PF number</label>
          <input id="li-pf" className="input" required autoComplete="username" value={pf} onChange={(e) => setPf(e.target.value)} />
        </div>
        <div>
          <label htmlFor="li-pw" className="label">Password</label>
          <input id="li-pw" type="password" className="input" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn-primary w-full" disabled={state.loading}>
          {state.loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />} Sign in
        </button>
      </form>

      <p className="mt-5 border-t border-brand-primary/20 pt-4 text-center text-sm">
        No account yet?{' '}
        <button className="font-semibold text-brand-700 hover:underline" onClick={() => setMode('request')}>Request an account</button>
      </p>
    </div>
  );
}
