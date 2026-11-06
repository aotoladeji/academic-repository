import { useCallback, useEffect, useState } from 'react';
import { Download, KeyRound, Loader2, Pencil, Search, Trash2, Upload, UserPlus } from 'lucide-react';
import api, { errorMessage } from '../lib/api.js';
import useDefaultPassword from '../lib/useDefaultPassword.js';
import { ErrorBox, Modal, OkBox, Pager } from './ui.jsx';

const FIELDS = [
  ['pf_number', 'PF number'], ['name', 'Full name'], ['department', 'Department'], ['faculty', 'Faculty'],
  ['designation', 'Designation'], ['email', 'Email'], ['phone', 'Phone'],
];
const EMPTY = { pf_number: '', name: '', department: '', faculty: '', designation: '', email: '', phone: '' };

export default function StaffManager() {
  const [defaultPw, setDefaultPw] = useDefaultPassword();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ data: [], last_page: 1, total: 0 });
  const [state, setState] = useState({ loading: true, error: '' });
  const [modal, setModal] = useState(null); // {type:'add'} | {type:'detail', id} | {type:'import'}

  const load = useCallback(async (query, p) => {
    setState({ loading: true, error: '' });
    try {
      const { data } = await api.get('/admin/staff', { params: { q: query || undefined, page: p } });
      setData(data);
      setState({ loading: false, error: '' });
    } catch (e) {
      setState({ loading: false, error: errorMessage(e) });
    }
  }, []);
  useEffect(() => { load('', 1); }, [load]);

  const refresh = () => load(q, page);

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-60 flex-1">
          <label htmlFor="dpw" className="label">Default password for new accounts</label>
          <input id="dpw" className="input" value={defaultPw} onChange={(e) => setDefaultPw(e.target.value)} />
        </div>
        <p className="max-w-md text-xs text-brand-ink/70">
          Used when you add a staff member, import a file, or approve a request. Staff must replace it on their first sign-in.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); setPage(1); load(q, 1); }} role="search">
          <div className="relative min-w-60 flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink/50" aria-hidden />
            <input className="input pl-9" placeholder="Search name, PF number, email, department…" aria-label="Search staff" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button className="btn-primary">Search</button>
        </form>
        <button className="btn-ghost" onClick={() => setModal({ type: 'import' })}><Upload size={16} /> Import Excel / CSV</button>
        <button className="btn-primary" onClick={() => setModal({ type: 'add' })}><UserPlus size={16} /> Add staff</button>
      </div>

      <ErrorBox>{state.error}</ErrorBox>
      <p className="text-sm">{state.loading ? 'Loading…' : `${data.total} staff member${data.total === 1 ? '' : 's'}`}</p>

      {!state.loading && !data.data.length && (
        <p className="card p-8 text-center text-sm">No staff found. Add some or import a spreadsheet.</p>
      )}

      {/* Phones: one card per person */}
      <ul className="space-y-3 md:hidden">
        {data.data.map((s) => (
          <li key={s.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{s.name}</p>
                <p className="text-xs text-brand-ink/70">PF {s.pf_number} · {s.designation}</p>
                <p className="mt-1 text-sm">{s.department}, {s.faculty}</p>
              </div>
              <AccountBadge s={s} />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-brand-ink/70">{s.publications_count} publication{s.publications_count === 1 ? '' : 's'}</span>
              <button className="btn-ghost" onClick={() => setModal({ type: 'detail', id: s.id })}>View</button>
            </div>
          </li>
        ))}
      </ul>

      {/* Tablets and computers: table */}
      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-primary/20 bg-brand-light/60 text-xs uppercase tracking-wide">
            <tr>{['PF number', 'Name', 'Department', 'Faculty', 'Account', 'Pubs', ''].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {data.data.map((s) => (
              <tr key={s.id} className="border-b border-brand-primary/10 last:border-0">
                <td className="px-3 py-2 font-medium">{s.pf_number}</td>
                <td className="px-3 py-2">{s.name}<span className="block text-xs text-brand-ink/60">{s.designation}</span></td>
                <td className="px-3 py-2">{s.department}</td>
                <td className="px-3 py-2">{s.faculty}</td>
                <td className="px-3 py-2"><AccountBadge s={s} /></td>
                <td className="px-3 py-2">{s.publications_count}</td>
                <td className="px-3 py-2 text-right">
                  <button className="btn-ghost !px-2.5 !py-1.5 !text-xs" onClick={() => setModal({ type: 'detail', id: s.id })}>View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={page} last={data.last_page} onPage={(p) => { setPage(p); load(q, p); }} />

      {modal?.type === 'add' && <StaffFormModal defaultPw={defaultPw} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />}
      {modal?.type === 'import' && <ImportModal defaultPw={defaultPw} onClose={() => { setModal(null); refresh(); }} />}
      {modal?.type === 'detail' && <DetailModal id={modal.id} defaultPw={defaultPw} onClose={() => setModal(null)} onChanged={refresh} />}
    </div>
  );
}

function AccountBadge({ s }) {
  if (!s.has_account) return <Badge tone="gray">No password</Badge>;
  if (!s.is_active) return <Badge tone="red">Deactivated</Badge>;
  if (s.must_change_password) return <Badge tone="amber">Temp password</Badge>;
  return <Badge tone="green">Active</Badge>;
}

function Badge({ tone, children }) {
  const tones = { gray: 'bg-gray-100 text-gray-700', red: 'bg-red-100 text-red-800', amber: 'bg-amber-100 text-amber-900', green: 'bg-green-100 text-green-900' };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

/* ---------- add / edit ---------- */
function StaffFormModal({ initial, defaultPw, onClose, onSaved }) {
  const editing = !!initial?.id;
  const [f, setF] = useState(initial ? Object.fromEntries(FIELDS.map(([k]) => [k, initial[k] ?? ''])) : { ...EMPTY, password: defaultPw });
  const [state, setState] = useState({ loading: false, error: '' });

  const submit = async (e) => {
    e.preventDefault();
    setState({ loading: true, error: '' });
    try {
      if (editing) await api.put(`/admin/staff/${initial.id}`, f);
      else await api.post('/admin/staff', f);
      onSaved();
    } catch (err) {
      setState({ loading: false, error: errorMessage(err) });
    }
  };

  const required = ['pf_number', 'name', 'department', 'faculty', 'designation'];
  return (
    <Modal title={editing ? 'Edit staff details' : 'Add staff member'} onClose={onClose}>
      <ErrorBox>{state.error}</ErrorBox>
      <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
        {FIELDS.map(([k, label]) => (
          <div key={k}>
            <label htmlFor={`sf-${k}`} className="label">{label}{required.includes(k) && <span className="text-red-700"> *</span>}</label>
            <input id={`sf-${k}`} className="input" required={required.includes(k)} type={k === 'email' ? 'email' : 'text'}
              value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
          </div>
        ))}
        {!editing && (
          <div>
            <label htmlFor="sf-pw" className="label">Starting password <span className="text-red-700">*</span></label>
            <input id="sf-pw" className="input" required minLength={6} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          </div>
        )}
        <div className="md:col-span-2">
          <button className="btn-primary" disabled={state.loading}>{state.loading && <Loader2 size={16} className="animate-spin" />} {editing ? 'Save changes' : 'Create account'}</button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- full details, password, delete ---------- */
function DetailModal({ id, defaultPw, onClose, onChanged }) {
  const [s, setS] = useState(null);
  const [pw, setPw] = useState(defaultPw);
  const [force, setForce] = useState(true);
  const [msg, setMsg] = useState({ error: '', ok: '' });
  const [editing, setEditing] = useState(false);

  const load = useCallback(() => api.get(`/admin/staff/${id}`).then(({ data }) => setS(data.data)).catch((e) => setMsg({ error: errorMessage(e), ok: '' })), [id]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn, ok) => {
    setMsg({ error: '', ok: '' });
    try { await fn(); setMsg({ error: '', ok }); await load(); onChanged(); } catch (e) { setMsg({ error: errorMessage(e), ok: '' }); }
  };

  const remove = async () => {
    if (!window.confirm(`Delete ${s.name} and all ${s.publications_count} of their publications? This cannot be undone.`)) return;
    try { await api.delete(`/admin/staff/${id}`); onChanged(); onClose(); } catch (e) { setMsg({ error: errorMessage(e), ok: '' }); }
  };

  if (editing && s) return <StaffFormModal initial={s} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load(); onChanged(); }} />;

  return (
    <Modal title="Staff details" onClose={onClose} wide>
      {!s ? <p className="text-sm">Loading…</p> : (
        <div className="space-y-5">
          <ErrorBox>{msg.error}</ErrorBox><OkBox>{msg.ok}</OkBox>
          <dl className="card grid gap-x-6 gap-y-3 p-4 text-sm md:grid-cols-2">
            {[['PF number', s.pf_number], ['Name', s.name], ['Department', s.department], ['Faculty', s.faculty], ['Designation', s.designation],
              ['Email', s.email || '—'], ['Phone', s.phone || '—'],
              ['Account', !s.has_account ? 'No password set' : s.is_active ? (s.must_change_password ? 'Active – temporary password' : 'Active') : 'Deactivated'],
              ['Last sign-in', s.last_login_at ? new Date(s.last_login_at).toLocaleString() : 'Never'],
              ['Record created', new Date(s.created_at).toLocaleDateString()]].map(([k, v]) => (
              <div key={k}><dt className="font-medium text-brand-ink/70">{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>

          <div className="card p-4">
            <h3 className="mb-2 text-base font-semibold">Assign password</h3>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-48 flex-1">
                <label htmlFor="np" className="label">New password</label>
                <input id="np" className="input" value={pw} onChange={(e) => setPw(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 pb-2 text-sm">
                <input type="checkbox" className="accent-brand-primary" checked={force} onChange={(e) => setForce(e.target.checked)} /> Must change at next sign-in
              </label>
              <button className="btn-primary" disabled={pw.length < 6}
                onClick={() => act(() => api.put(`/admin/staff/${id}/password`, { password: pw, must_change_password: force }), 'Password updated. The staff member has been signed out.')}>
                <KeyRound size={16} /> Set password
              </button>
            </div>
          </div>

          <div className="card p-4">
            <h3 className="mb-2 text-base font-semibold">Publications ({s.publications_count})</h3>
            {s.publications.length ? (
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {s.publications.map((p) => <li key={p.id}>{p.title} <span className="text-brand-ink/60">({p.publication_year})</span></li>)}
              </ul>
            ) : <p className="text-sm text-brand-ink/70">No publications yet.</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={() => setEditing(true)}><Pencil size={16} /> Edit details</button>
            <button className="btn-ghost" onClick={() => act(() => api.put(`/admin/staff/${id}`, { is_active: !s.is_active }), s.is_active ? 'Account deactivated.' : 'Account reactivated.')}>
              {s.is_active ? 'Deactivate account' : 'Reactivate account'}
            </button>
            <button className="btn-ghost !text-red-700" onClick={remove}><Trash2 size={16} /> Delete staff</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ---------- Excel / CSV import ---------- */
function ImportModal({ defaultPw, onClose }) {
  const [file, setFile] = useState(null);
  const [pw, setPw] = useState(defaultPw);
  const [update, setUpdate] = useState(true);
  const [state, setState] = useState({ loading: false, error: '', result: null });

  const template = () => {
    const csv = 'pf_number,name,department,faculty,designation,email,phone,password\n'
      + 'PF2001,Dr. Jane Doe,Computer Science,Science,Senior Lecturer,jane@example.edu,08000000000,\n';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'staff-import-template.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const submit = async (e) => {
    e.preventDefault();
    const body = new FormData();
    body.append('file', file);
    body.append('default_password', pw);
    body.append('update_existing', update ? '1' : '0');
    setState({ loading: true, error: '', result: null });
    try {
      const { data } = await api.post('/admin/staff/import', body, { headers: { 'Content-Type': 'multipart/form-data' } });
      setState({ loading: false, error: '', result: data });
    } catch (err) {
      setState({ loading: false, error: errorMessage(err), result: null });
    }
  };

  const r = state.result;
  return (
    <Modal title="Import staff from Excel / CSV" onClose={onClose} wide>
      <p className="mb-3 text-sm">
        The first row must contain headings. Recognised columns: <code>pf_number, name, department, faculty, designation, email, phone, password</code>.
        Leave <code>password</code> empty to use the default password below.{' '}
        <button type="button" className="font-semibold text-brand-700 hover:underline" onClick={template}><Download size={13} className="mr-1 inline" />Download template</button>
      </p>
      <ErrorBox>{state.error}</ErrorBox>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="imp-file" className="label">File (.xlsx or .csv)</label>
          <input id="imp-file" type="file" accept=".xlsx,.csv,.txt" required className="input" onChange={(e) => setFile(e.target.files[0] ?? null)} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="imp-pw" className="label">Default password for new accounts</label>
            <input id="imp-pw" className="input" required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 pt-6 text-sm">
            <input type="checkbox" className="accent-brand-primary" checked={update} onChange={(e) => setUpdate(e.target.checked)} /> Update details of staff who already exist
          </label>
        </div>
        <button className="btn-primary" disabled={state.loading || !file}>
          {state.loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Import
        </button>
      </form>

      {r && (
        <div className="mt-5 space-y-3">
          <OkBox>{`Done: ${r.created} created, ${r.updated} updated, ${r.skipped} skipped.`}</OkBox>
          {r.errors.length > 0 && (
            <div className="card max-h-48 overflow-y-auto p-3 text-sm">
              <p className="mb-1 font-semibold">Rows that were skipped</p>
              <ul className="space-y-1">{r.errors.map((x, i) => <li key={i}>Row {x.row}: {x.message}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
