import { useCallback, useEffect, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import api, { errorMessage } from '../lib/api.js';
import { ErrorBox, OkBox } from './ui.jsx';

const AUDIENCES = [
  ['all', 'All active staff'], ['faculty', 'One faculty'], ['department', 'One department'], ['selected', 'Specific PF numbers'],
];

export default function MailCenter() {
  const [f, setF] = useState({ audience: 'all', faculty: '', department: '', pfText: '', subject: '', body: '' });
  const [count, setCount] = useState(null);
  const [history, setHistory] = useState([]);
  const [state, setState] = useState({ sending: false, error: '', ok: '' });

  const audiencePayload = useCallback(() => ({
    audience: f.audience,
    faculty: f.audience === 'faculty' ? f.faculty : undefined,
    department: f.audience === 'department' ? f.department : undefined,
    pf_numbers: f.audience === 'selected' ? f.pfText.split(/[\s,;]+/).filter(Boolean) : undefined,
  }), [f.audience, f.faculty, f.department, f.pfText]);

  const ready = f.audience === 'all' || (f.audience === 'faculty' && f.faculty.trim()) ||
    (f.audience === 'department' && f.department.trim()) || (f.audience === 'selected' && f.pfText.trim());

  // live "who will receive this" count
  useEffect(() => {
    if (!ready) { setCount(null); return; }
    const t = setTimeout(() => {
      api.post('/admin/messages/preview', audiencePayload()).then(({ data }) => setCount(data.count)).catch(() => setCount(null));
    }, 400);
    return () => clearTimeout(t);
  }, [ready, audiencePayload]);

  const loadHistory = useCallback(() => api.get('/admin/messages').then(({ data }) => setHistory(data.data)).catch(() => {}), []);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  const send = async (e) => {
    e.preventDefault();
    if (!window.confirm(`Send this email to ${count ?? 'the selected'} staff member(s)?`)) return;
    setState({ sending: true, error: '', ok: '' });
    try {
      const { data } = await api.post('/admin/messages', { ...audiencePayload(), subject: f.subject, body: f.body });
      setState({ sending: false, error: '', ok: `Sent to ${data.sent} recipient(s)${data.failed ? `; ${data.failed} failed (check your MAIL settings / storage/logs/laravel.log)` : ''}.` });
      setF({ ...f, subject: '', body: '' });
      loadHistory();
    } catch (err) {
      setState({ sending: false, error: errorMessage(err), ok: '' });
    }
  };

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <form onSubmit={send} className="card space-y-4 p-5">
        <h2 className="text-xl font-semibold">Send an email to staff</h2>
        <ErrorBox>{state.error}</ErrorBox><OkBox>{state.ok}</OkBox>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="m-aud" className="label">Send to</label>
            <select id="m-aud" className="input" value={f.audience} onChange={set('audience')}>
              {AUDIENCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          {f.audience === 'faculty' && <div><label htmlFor="m-fac" className="label">Faculty (exact name)</label><input id="m-fac" className="input" value={f.faculty} onChange={set('faculty')} /></div>}
          {f.audience === 'department' && <div><label htmlFor="m-dep" className="label">Department (exact name)</label><input id="m-dep" className="input" value={f.department} onChange={set('department')} /></div>}
        </div>
        {f.audience === 'selected' && (
          <div>
            <label htmlFor="m-pf" className="label">PF numbers (separate with commas, spaces or new lines)</label>
            <textarea id="m-pf" rows={2} className="input" value={f.pfText} onChange={set('pfText')} />
          </div>
        )}
        <p className="text-sm text-brand-ink/70" aria-live="polite">
          {count === null ? 'Choose an audience to see how many people will receive this.' : `${count} recipient${count === 1 ? '' : 's'} with an email address.`}
        </p>

        <div>
          <label htmlFor="m-sub" className="label">Subject</label>
          <input id="m-sub" className="input" required maxLength={200} value={f.subject} onChange={set('subject')} />
        </div>
        <div>
          <label htmlFor="m-body" className="label">Message</label>
          <textarea id="m-body" rows={9} className="input" required value={f.body} onChange={set('body')}
            placeholder="Each person is greeted by name automatically (“Dear Dr. Okafor,”). You can also type {name} anywhere in the text." />
        </div>
        <button className="btn-primary" disabled={state.sending || !ready || count === 0}>
          {state.sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send email
        </button>
      </form>

      <aside className="card h-fit p-4">
        <h3 className="mb-2 text-base font-semibold">Recently sent</h3>
        {!history.length && <p className="text-sm text-brand-ink/70">Nothing sent yet.</p>}
        <ul className="space-y-3 text-sm">
          {history.map((m) => (
            <li key={m.id} className="border-b border-brand-primary/10 pb-2 last:border-0">
              <p className="font-medium">{m.subject}</p>
              <p className="text-xs text-brand-ink/70">{new Date(m.created_at).toLocaleString()} · {m.recipient_count} sent{m.failed_count ? `, ${m.failed_count} failed` : ''}</p>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
