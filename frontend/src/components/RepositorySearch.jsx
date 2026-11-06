import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Globe2, Loader2, Search, Telescope } from 'lucide-react';
import api, { errorMessage } from '../lib/api.js';
import { countryName } from '../lib/countries.js';
import CollaborationBadge from './CollaborationBadge.jsx';
import SimilarPublicationsModal from './SimilarPublicationsModal.jsx';

const EMPTY = { staff_name: '', pf_number: '', department: '', faculty: '', keyword: '', year: '', collaboration: '' };

export default function RepositorySearch() {
  const [filters, setFilters] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], last_page: 1, total: 0 });
  const [formFields, setFormFields] = useState([]);
  const [open, setOpen] = useState(() => new Set());
  const [similarFor, setSimilarFor] = useState(null); // { pub, scope }
  const [state, setState] = useState({ loading: true, error: '' });

  const run = useCallback(async (f, p) => {
    setState({ loading: true, error: '' });
    try {
      const params = Object.fromEntries(Object.entries({ ...f, page: p }).filter(([, v]) => v !== ''));
      const { data } = await api.get('/publications', { params });
      setResult(data);
      setState({ loading: false, error: '' });
    } catch (e) {
      setState({ loading: false, error: errorMessage(e) });
    }
  }, []);

  useEffect(() => { run(EMPTY, 1); api.get('/form-fields').then(({ data }) => setFormFields(data.data)).catch(() => {}); }, [run]);

  const submit = (e) => { e.preventDefault(); setPage(1); run(filters, 1); };
  const clear = () => { setFilters(EMPTY); setPage(1); run(EMPTY, 1); };
  const go = (p) => { setPage(p); run(filters, p); };
  const toggle = (id) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  const input = (k, label, extra = {}) => (
    <div>
      <label htmlFor={`f-${k}`} className="label">{label}</label>
      <input id={`f-${k}`} className="input" value={filters[k]} onChange={set(k)} {...extra} />
    </div>
  );

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="card p-5" role="search" aria-label="Search publications">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-3">
            <label htmlFor="f-keyword" className="label">Keyword</label>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink/50" aria-hidden />
              <input id="f-keyword" className="input pl-9" placeholder="Title, abstract, DOI or co-author" value={filters.keyword} onChange={set('keyword')} />
            </div>
          </div>
          {input('staff_name', 'Staff name')}
          {input('pf_number', 'PF number')}
          {input('year', 'Publication year', { type: 'number', min: 1900, max: 2100, placeholder: 'e.g. 2024' })}
          {input('department', 'Department')}
          {input('faculty', 'Faculty')}
          <div>
            <label htmlFor="f-collab" className="label">Collaboration</label>
            <select id="f-collab" className="input" value={filters.collaboration} onChange={set('collaboration')}>
              <option value="">All publications</option>
              <option value="africa">Within Africa</option>
              <option value="global">Global (outside Africa)</option>
              <option value="sole">No co-authors</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button className="btn-primary"><Search size={16} /> Search</button>
          <button type="button" className="btn-ghost" onClick={clear}>Clear filters</button>
        </div>
      </form>

      <section aria-live="polite">
        <p className="mb-3 text-sm">
          {state.loading ? <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Searching…</span>
            : `${result.total} publication${result.total === 1 ? '' : 's'} found`}
        </p>
        {state.error && <p role="alert" className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}
        {!state.loading && !state.error && !result.data.length && (
          <p className="card p-6 text-center text-sm">Nothing matches those filters. Remove one or two and try again.</p>
        )}

        <ul className="space-y-3">
          {result.data.map((p) => {
            const isOpen = open.has(p.id);
            return (
              <li key={p.id} className="card">
                <button className="flex w-full items-start justify-between gap-4 p-4 text-left" onClick={() => toggle(p.id)} aria-expanded={isOpen} aria-controls={`pub-${p.id}`}>
                  <span>
                    <span className="block text-lg font-semibold leading-snug">{p.title}</span>
                    <span className="mt-1 block text-sm text-brand-ink/80">
                      {p.staff.name} · PF {p.staff.pf_number} · {p.staff.department} · {p.publication_year}
                    </span>
                  </span>
                  <ChevronDown size={18} className={`mt-1 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden />
                </button>

                {/* Collaboration + link to the publication */}
                <div className="flex flex-wrap items-center gap-3 border-t border-brand-primary/10 px-4 py-2">
                  <CollaborationBadge scope={p.collaboration_scope} />
                  {p.publication_link && (
                    <a className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline" href={p.publication_link} target="_blank" rel="noreferrer">
                      View publication <ExternalLink size={13} aria-hidden />
                    </a>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-brand-primary/10 px-4 py-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-brand-ink/60">Compare with</span>
                  <button className="btn-ghost !px-2.5 !py-1.5 !text-xs" onClick={() => setSimilarFor({ pub: p, scope: 'africa' })}>
                    <Telescope size={14} /> African publications
                  </button>
                  <button className="btn-ghost !px-2.5 !py-1.5 !text-xs" onClick={() => setSimilarFor({ pub: p, scope: 'global' })}>
                    <Globe2 size={14} /> Global publications
                  </button>
                </div>

                {isOpen && (
                  <div id={`pub-${p.id}`} className="space-y-4 border-t border-brand-primary/20 p-4 text-sm">
                    <dl className="grid gap-x-6 gap-y-2 md:grid-cols-2">
                      <Row k="Faculty" v={p.staff.faculty} />
                      <Row k="Designation" v={p.staff.designation} />
                      <Row k="Published" v={p.publication_date} />
                      <Row k="DOI" v={p.doi && <a className="text-brand-700 hover:underline" href={`https://doi.org/${p.doi}`} target="_blank" rel="noreferrer">{p.doi}</a>} />
                      <Row k="Link" v={p.url && <a className="inline-flex items-center gap-1 text-brand-700 hover:underline" href={p.url} target="_blank" rel="noreferrer">Open <ExternalLink size={12} /></a>} />
                      {formFields.map((f) => {
                        const v = p.custom_field_values?.[f.field_key];
                        return <Row key={f.id} k={f.label} v={Array.isArray(v) ? v.join(', ') : v} />;
                      })}
                    </dl>

                    {p.co_authors?.length > 0 && (
                      <div>
                        <h3 className="mb-1 text-base font-semibold">Co-authors</h3>
                        <ul className="space-y-1">
                          {p.co_authors.map((a, i) => (
                            <li key={i}>
                              <strong>{a.name}</strong>
                              {a.affiliation ? `, ${a.affiliation}` : ''}
                              {a.country ? <span className="text-brand-ink/70"> ({countryName(a.country)})</span> : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {p.abstract && <div><h3 className="mb-1 text-base font-semibold">Abstract</h3><p className="max-w-prose leading-relaxed">{p.abstract}</p></div>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {result.last_page > 1 && (
          <nav className="mt-6 flex items-center justify-center gap-3" aria-label="Pagination">
            <button className="btn-ghost" disabled={page <= 1} onClick={() => go(page - 1)}><ChevronLeft size={16} /> Previous</button>
            <span className="text-sm">Page {page} of {result.last_page}</span>
            <button className="btn-ghost" disabled={page >= result.last_page} onClick={() => go(page + 1)}>Next <ChevronRight size={16} /></button>
          </nav>
        )}
      </section>

      <SimilarPublicationsModal open={!!similarFor} onClose={() => setSimilarFor(null)} title={similarFor?.pub.title} doi={similarFor?.pub.doi} initialScope={similarFor?.scope} />
    </div>
  );
}

function Row({ k, v }) {
  if (!v) return null;
  return <div><dt className="font-medium text-brand-ink/70">{k}</dt><dd>{v}</dd></div>;
}