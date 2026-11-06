import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import api, { errorMessage } from '../lib/api.js';
import useDefaultPassword from '../lib/useDefaultPassword.js';
import { ErrorBox, OkBox } from './ui.jsx';

const FILTERS = [['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']];

export default function AccountRequests() {
  const [defaultPw, setDefaultPw] = useDefaultPassword();
  const [status, setStatus] = useState('pending');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ error: '', ok: '' });
  const [busy, setBusy] = useState(null);

  const load = useCallback(async (st) => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/account-requests', { params: { status: st } });
      setRows(data.data);
    } catch (e) {
      setMsg({ error: errorMessage(e), ok: '' });
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(status); }, [status, load]);

  const approve = async (r) => {
    setBusy(r.id); setMsg({ error: '', ok: '' });
    try {
      const { data } = await api.post(`/admin/account-requests/${r.id}/approve`, { password: defaultPw });
      setMsg({ error: '', ok: `${r.name} approved. ` + (data.emailed ? 'Login details were emailed.' : `Email could not be sent – tell them directly: PF ${r.pf_number}, password "${defaultPw}".`) });
      load(status);
    } catch (e) {
      setMsg({ error: errorMessage(e), ok: '' });
    } finally { setBusy(null); }
  };

  const reject = async (r) => {
    if (!window.confirm(`Reject the request from ${r.name}?`)) return;
    setBusy(r.id);
    try { await api.post(`/admin/account-requests/${r.id}/reject`); load(status); }
    catch (e) { setMsg({ error: errorMessage(e), ok: '' }); }
    finally { setBusy(null); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div role="group" aria-label="Filter requests" className="flex overflow-hidden rounded-md border border-brand-primary/40">
          {FILTERS.map(([id, label]) => (
            <button key={id} onClick={() => setStatus(id)} aria-pressed={status === id}
              className={`px-3 py-2 text-sm font-medium ${status === id ? 'bg-brand-primary text-white' : 'bg-white hover:bg-brand-light'}`}>{label}</button>
          ))}
        </div>
        <div>
          <label htmlFor="rq-dpw" className="label">Default password given on approval</label>
          <input id="rq-dpw" className="input" value={defaultPw} onChange={(e) => setDefaultPw(e.target.value)} />
        </div>
      </div>

      <ErrorBox>{msg.error}</ErrorBox><OkBox>{msg.ok}</OkBox>
      {loading && <p className="flex items-center gap-2 text-sm"><Loader2 size={16} className="animate-spin" /> Loading…</p>}
      {!loading && !rows.length && <p className="card p-6 text-center text-sm">No {status} requests.</p>}

      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="text-sm">
                <p className="text-base font-semibold">{r.name} <span className="font-normal text-brand-ink/70">· PF {r.pf_number}</span></p>
                <p>{r.designation}, {r.department}, {r.faculty}</p>
                <p className="text-brand-ink/70">{r.email} · requested {new Date(r.created_at).toLocaleDateString()}</p>
                {r.message && <p className="mt-2 rounded bg-brand-light p-2">“{r.message}”</p>}
              </div>
              {r.status === 'pending' && (
                <div className="flex gap-2">
                  <button className="btn-primary" disabled={busy === r.id || defaultPw.length < 6} onClick={() => approve(r)}>
                    {busy === r.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Approve
                  </button>
                  <button className="btn-ghost" disabled={busy === r.id} onClick={() => reject(r)}><X size={16} /> Reject</button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
