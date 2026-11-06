import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import api, { errorMessage } from '../lib/api.js';
import PublicationSubmission from '../components/PublicationSubmission.jsx';
import { ErrorBox, OkBox, Pager } from './ui.jsx';

export default function PublicationsManager() {
  const [mode, setMode] = useState('list'); // list | add
  return mode === 'list' ? <List onAdd={() => setMode('add')} /> : <AddOnBehalf onBack={() => setMode('list')} />;
}

function List({ onAdd }) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ data: [], last_page: 1, total: 0 });
  const [state, setState] = useState({ loading: true, error: '', ok: '' });

  const load = useCallback(async (keyword, p) => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const { data } = await api.get('/publications', { params: { keyword: keyword || undefined, page: p, per_page: 15 } });
      setData(data);
      setState((s) => ({ ...s, loading: false }));
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: errorMessage(e) }));
    }
  }, []);
  useEffect(() => { load('', 1); }, [load]);

  const remove = async (p) => {
    if (!window.confirm(`Delete “${p.title}”? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/publications/${p.id}`);
      setState((s) => ({ ...s, ok: 'Publication deleted.', error: '' }));
      load(q, page);
    } catch (e) {
      setState((s) => ({ ...s, error: errorMessage(e), ok: '' }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <form className="flex flex-1 gap-2" role="search" onSubmit={(e) => { e.preventDefault(); setPage(1); load(q, 1); }}>
          <div className="relative min-w-60 flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink/50" aria-hidden />
            <input className="input pl-9" aria-label="Search publications" placeholder="Search title, abstract, DOI…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button className="btn-primary">Search</button>
        </form>
        <button className="btn-primary" onClick={onAdd}><Plus size={16} /> Add publication</button>
      </div>

      <ErrorBox>{state.error}</ErrorBox><OkBox>{state.ok}</OkBox>
      <p className="text-sm">{state.loading ? <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</span> : `${data.total} publication${data.total === 1 ? '' : 's'}`}</p>

      <ul className="space-y-2">
        {data.data.map((p) => (
          <li key={p.id} className="card flex items-start justify-between gap-4 p-4">
            <div className="text-sm">
              <p className="text-base font-semibold leading-snug">{p.title}</p>
              <p className="text-brand-ink/80">{p.staff.name} · PF {p.staff.pf_number} · {p.staff.department} · {p.publication_year}</p>
              {p.doi && <p className="text-brand-ink/60">DOI {p.doi}</p>}
            </div>
            <button className="btn-ghost !text-red-700" onClick={() => remove(p)} aria-label={`Delete ${p.title}`}><Trash2 size={16} /> Delete</button>
          </li>
        ))}
      </ul>
      <Pager page={page} last={data.last_page} onPage={(p) => { setPage(p); load(q, p); }} />
    </div>
  );
}

function AddOnBehalf({ onBack }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [staff, setStaff] = useState(null);
  const [error, setError] = useState('');

  const search = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.get('/admin/staff', { params: { q, per_page: 8 } });
      setResults(data.data);
      if (!data.data.length) setError('No staff matched that search.');
    } catch (err) { setError(errorMessage(err)); }
  };

  return (
    <div className="space-y-4">
      <button className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline" onClick={onBack}><ArrowLeft size={14} /> Back to publications</button>

      {!staff ? (
        <div className="card mx-auto max-w-2xl p-5">
          <h2 className="mb-1 text-xl font-semibold">Add a publication for…</h2>
          <p className="mb-3 text-sm text-brand-ink/70">Find the staff member first.</p>
          <ErrorBox>{error}</ErrorBox>
          <form onSubmit={search} className="flex gap-2">
            <input className="input" aria-label="Find staff" placeholder="Name or PF number" value={q} onChange={(e) => setQ(e.target.value)} required />
            <button className="btn-primary"><Search size={16} /> Find</button>
          </form>
          <ul className="mt-3 divide-y divide-brand-primary/10">
            {results.map((s) => (
              <li key={s.id}>
                <button className="flex w-full items-center justify-between gap-3 px-1 py-2 text-left text-sm hover:bg-brand-light" onClick={() => setStaff(s)}>
                  <span><strong>{s.name}</strong> · PF {s.pf_number}<span className="block text-xs text-brand-ink/60">{s.department}, {s.faculty}</span></span>
                  <span className="font-medium text-brand-700">Select</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <p className="text-center text-sm">Adding for <strong>{staff.name}</strong> (PF {staff.pf_number}) · <button className="font-medium text-brand-700 hover:underline" onClick={() => setStaff(null)}>change</button></p>
          <PublicationSubmission staff={staff} endpoint="/admin/publications" />
        </>
      )}
    </div>
  );
}
