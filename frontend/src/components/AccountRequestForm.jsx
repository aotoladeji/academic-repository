import { useState } from 'react';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import api, { errorMessage } from '../lib/api.js';
import Logo from './Logo.jsx';

const EMPTY = { pf_number: '', name: '', email: '', department: '', faculty: '', designation: '', message: '' };
const FIELDS = [
  ['pf_number', 'PF number'], ['name', 'Full name'], ['email', 'Email address'],
  ['department', 'Department'], ['faculty', 'Faculty'], ['designation', 'Designation'],
];

export default function AccountRequestForm({ onBack }) {
  const [form, setForm] = useState(EMPTY);
  const [state, setState] = useState({ loading: false, error: '', done: '' });

  const submit = async (e) => {
    e.preventDefault();
    setState({ loading: true, error: '', done: '' });
    try {
      const { data } = await api.post('/account-requests', form);
      setState({ loading: false, error: '', done: data.message });
      setForm(EMPTY);
    } catch (err) {
      setState({ loading: false, error: errorMessage(err), done: '' });
    }
  };

  return (
    <div className="card mx-auto max-w-xl p-6">
      <button className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline" onClick={onBack}>
        <ArrowLeft size={14} /> Back to sign in
      </button>
      
      <h2 className="text-2xl font-semibold">Request an account</h2>
      <p className="mb-4 mt-1 text-sm text-brand-ink/70">The administrator reviews each request and emails you a temporary password.</p>

      {state.error && <p role="alert" className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}
      {state.done && <p role="status" className="mb-3 rounded-md bg-green-50 p-3 text-sm text-green-900">{state.done}</p>}

      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        {FIELDS.map(([k, label]) => (
          <div key={k}>
            <label htmlFor={`rq-${k}`} className="label">{label} <span className="text-red-700">*</span></label>
            <input id={`rq-${k}`} className="input" required type={k === 'email' ? 'email' : 'text'}
              value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
          </div>
        ))}
        <div className="md:col-span-2">
          <label htmlFor="rq-msg" className="label">Note to administrator (optional)</label>
          <textarea id="rq-msg" rows={3} className="input" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <button className="btn-primary" disabled={state.loading}>
            {state.loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send request
          </button>
        </div>
      </form>
    </div>
  );
}
