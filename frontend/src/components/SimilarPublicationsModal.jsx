import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Loader2, Quote, X } from 'lucide-react';
import api, { errorMessage } from '../lib/api.js';

const SCOPES = [
  { id: 'global', label: 'Worldwide' },
  { id: 'africa', label: 'African institutions' },
  { id: 'country', label: 'One country' },
];

const band = (n) => (n >= 60 ? 'High match' : n >= 35 ? 'Moderate match' : 'Loose match');

/**
 * Props: open, onClose, title, doi (optional)
 * Calls GET /external/similar, which proxies OpenAlex through Laravel.
 */
export default function SimilarPublicationsModal({ open, onClose, title, doi, initialScope = 'global' }) {
  const [scope, setScope] = useState(initialScope);
  const [country, setCountry] = useState('NG');
  const [state, setState] = useState({ loading: false, error: '', results: [] });
  const closeRef = useRef(null);

  // Each time the window opens, start on the scope the user clicked (Africa or Worldwide)
  useEffect(() => {
    if (open) setScope(initialScope);
  }, [open, initialScope]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !title) return;
    if (scope === 'country' && country.length !== 2) return;
    const controller = new AbortController();
    setState({ loading: true, error: '', results: [] });
    api.get('/external/similar', {
      params: { title, doi: doi || undefined, scope, country_code: scope === 'country' ? country : undefined, limit: 10 },
      signal: controller.signal,
    })
      .then(({ data }) => setState({ loading: false, error: '', results: data.data }))
      .catch((e) => { if (!controller.signal.aborted) setState({ loading: false, error: errorMessage(e), results: [] }); });
    return () => controller.abort();
  }, [open, title, doi, scope, country]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-brand-ink/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div role="dialog" aria-modal="true" aria-labelledby="sim-h" className="my-4 w-full max-w-3xl rounded-lg bg-brand-light shadow-xl sm:my-8">
        <div className="flex items-start justify-between gap-4 border-b border-brand-primary/20 p-5">
          <div>
            <h2 id="sim-h" className="text-xl font-semibold">Similar publications</h2>
            <p className="mt-1 text-sm text-brand-ink/70">Matches for “{title}” from OpenAlex</p>
          </div>
          <button ref={closeRef} className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <div className="flex flex-wrap items-end gap-3 border-b border-brand-primary/20 p-5">
          <div role="group" aria-label="Search scope" className="grid w-full grid-cols-3 overflow-hidden rounded-md border border-brand-primary/40 sm:flex sm:w-auto">
            {SCOPES.map((s) => (
              <button key={s.id} onClick={() => setScope(s.id)} aria-pressed={scope === s.id}
                className={`px-2 py-2.5 text-xs font-medium sm:px-3 sm:py-2 sm:text-sm ${scope === s.id ? 'bg-brand-primary text-white' : 'bg-white text-brand-ink hover:bg-brand-light'}`}>
                {s.label}
              </button>
            ))}
          </div>
          {scope === 'country' && (
            <div>
              <label htmlFor="cc" className="label">Country code</label>
              <input id="cc" className="input w-24 uppercase" maxLength={2} value={country} onChange={(e) => setCountry(e.target.value.replace(/[^a-z]/gi, ''))} />
            </div>
          )}
        </div>

        <div className="p-5">
          {state.loading && <p className="flex items-center gap-2 text-sm"><Loader2 size={16} className="animate-spin" /> Searching OpenAlex…</p>}
          {state.error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}
          {!state.loading && !state.error && !state.results.length && <p className="text-sm">No similar publications found for this scope. Try widening it.</p>}

          <ul className="space-y-3">
            {state.results.map((r) => (
              <li key={r.openalex_id} className="card p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <h3 className="text-base font-semibold leading-snug">{r.title}</h3>
                  <div className="w-full sm:w-28 sm:shrink-0 sm:text-right" title="Blend of title overlap and OpenAlex relevance">
                    <p className="text-sm font-semibold text-brand-700">{r.similarity}% · {band(r.similarity)}</p>
                    <div className="mt-1 h-2 rounded-full bg-brand-light" role="progressbar" aria-valuenow={r.similarity} aria-valuemin={0} aria-valuemax={100} aria-label="Similarity">
                      <div className="h-2 rounded-full bg-brand-primary" style={{ width: `${r.similarity}%` }} />
                    </div>
                  </div>
                </div>
                <p className="mt-1 text-sm text-brand-ink/80">
                  {r.authors.join(', ')}{r.year ? ` (${r.year})` : ''}{r.venue ? ` — ${r.venue}` : ''}
                </p>
                {r.institutions.length > 0 && <p className="text-xs text-brand-ink/60">{r.institutions.join('; ')}</p>}
                {r.snippet && <p className="mt-2 text-sm">{r.snippet}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                  <span className="inline-flex items-center gap-1 text-brand-ink/70"><Quote size={14} aria-hidden /> {r.cited_by_count} citations</span>
                  {r.doi_url && <a className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline" href={r.doi_url} target="_blank" rel="noreferrer">DOI <ExternalLink size={13} aria-hidden /></a>}
                  {r.landing_url && <a className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline" href={r.landing_url} target="_blank" rel="noreferrer">Source <ExternalLink size={13} aria-hidden /></a>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
