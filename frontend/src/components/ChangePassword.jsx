import { useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import api, { errorMessage } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';

/** Shown to staff on first sign-in (forced), because the admin set their password. */
export default function ChangePassword({ forced = false }) {
  const { refreshStaff } = useAuth();
  const [f, setF] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [state, setState] = useState({ loading: false, error: '' });

  const submit = async (e) => {
    e.preventDefault();
    setState({ loading: true, error: '' });
    try {
      await api.post('/staff/change-password', f);
      await refreshStaff();
    } catch (err) {
      setState({ loading: false, error: errorMessage(err) });
    }
  };

  const field = (k, label, ac) => (
    <div>
      <label htmlFor={`cp-${k}`} className="label">{label}</label>
      <input id={`cp-${k}`} type="password" className="input" required autoComplete={ac}
        value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </div>
  );

  return (
    <div className="card mx-auto max-w-md p-6">
      <h2 className="text-2xl font-semibold">{forced ? 'Choose a new password' : 'Change password'}</h2>
      {forced && <p className="mt-1 text-sm text-brand-ink/70">For your security, replace the temporary password the administrator gave you.</p>}
      {state.error && <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}
      <form onSubmit={submit} className="mt-4 space-y-4">
        {field('current_password', 'Current (temporary) password', 'current-password')}
        {field('password', 'New password (at least 8 characters)', 'new-password')}
        {field('password_confirmation', 'Repeat new password', 'new-password')}
        <button className="btn-primary w-full" disabled={state.loading}>
          {state.loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />} Save password
        </button>
      </form>
    </div>
  );
}
