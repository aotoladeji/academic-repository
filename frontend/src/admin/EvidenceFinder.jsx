import { useCallback, useEffect, useState } from 'react';
import { Check, ClipboardCopy, ExternalLink, Loader2, Search } from 'lucide-react';
import api, { errorMessage } from '../lib/api.js';
import { countryName } from '../lib/countries.js';
import { ErrorBox } from './ui.jsx';

const PARTNERS = [
  ['other_african', 'Co-authors from other African countries'],
  ['outside_home', 'Co-authors from any other country'],
  ['any', 'Any co-authored paper'],
];
const NOT_INTERNATIONAL = /^(not indexed|none|other)$/i;
const INDEX_KEY = 'indexing_database';

const BLANK = {
  staff: '', department: '', faculty: '', keyword: '',
  partner: 'other_african', home: 'NG', indexed: [], yearFrom: '', yearTo: '', withLink: true,
};

export default function EvidenceFinder() {
  const [indexOptions, setIndexOptions] = useState([]);
  const [f, setF] = useState(BLANK);
  const [target, setTarget] = useState(20);
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [state, setState] = useState({ loading: false, error: '', searched: false });
  const [copied, setCopied] = useState('');

  const search = useCallback(async (filters) => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const params = { partner: filters.partner, home_country: filters.home, with_link: filters.withLink ? 1 : 0 };
      ['staff', 'department', 'faculty', 'keyword'].forEach((k) => { if (filters[k].trim()) params[k] = filters[k].trim(); });
      if (filters.indexed.length) params.indexed_in = filters.indexed;
      if (filters.yearFrom) params.year_from = filters.yearFrom;
      if (filters.yearTo) params.year_to = filters.yearTo;
      const { data } = await api.get('/admin/evidence', { params });
      setRows(data.data);
      setSelected((prev) => new Set([...prev].filter((id) => data.data.some((r) => r.id === id))));
      setState({ loading: false, error: '', searched: true });
    } catch (e) {
      setState({ loading: false, error: errorMessage(e), searched: true });
    }
  }, []);

  // Load the "Indexed in" options once, tick the international ones, and run a first search
  useEffect(() => {
    api.get('/admin/form-fields').then(({ data }) => {
      const field = data.data.find((x) => x.field_key === INDEX_KEY);
      const options = field?.options ?? [];
      setIndexOptions(options);
      const next = { ...BLANK, indexed: options.filter((o) => !NOT_INTERNATIONAL.test(o)) };
      setF(next);
      search(next);
    }).catch(() => search(BLANK));
  }, [search]);

  const set = (patch) => setF((cur) => ({ ...cur, ...patch }));
  const toggleIndexed = (opt) => set({ indexed: f.indexed.includes(opt) ? f.indexed.filter((x) => x !== opt) : [...f.indexed, opt] });
  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const resetFilters = () => {
    const next = { ...BLANK, indexed: indexOptions.filter((o) => !NOT_INTERNATIONAL.test(o)) };
    setF(next);
    search(next);
  };

  const selectable = rows.filter((r) => r.publication_link);
  const chosen = rows.filter((r) => selected.has(r.id) && r.publication_link);
  const links = [...new Set(chosen.map((r) => r.publication_link))];
  const count = links.length;
  const reached = count >= target;

  const plainText = links.join('\n');
  const titledText = chosen.map((r, i) => `${i + 1}. ${r.title} (${r.publication_year}) – ${r.publication_link}`).join('\n');

  const copy = async (text, which) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(which);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Evidence finder</h2>
        <p className="text-sm text-brand-ink/70">Find papers that answer a reporting question, tick the ones you want, and copy their links in one click.</p>
      </div>

      <form className="card space-y-4 p-4" onSubmit={(e) => { e.preventDefault(); search(f); }}>
        {/* Who */}
        <div>
          <p className="mb-2 text-sm font-semibold">Whose papers? <span className="font-normal text-brand-ink/60">(leave empty for every staff member)</span></p>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <label htmlFor="ev-staff" className="label">Author name or PF number</label>
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink/50" aria-hidden />
                <input id="ev-staff" className="input pl-9" placeholder="e.g. Okafor or PF1001" value={f.staff} onChange={(e) => set({ staff: e.target.value })} />
              </div>
            </div>
            <div>
              <label htmlFor="ev-dept" className="label">Department</label>
              <input id="ev-dept" className="input" value={f.department} onChange={(e) => set({ department: e.target.value })} />
            </div>
            <div>
              <label htmlFor="ev-fac" className="label">Faculty</label>
              <input id="ev-fac" className="input" value={f.faculty} onChange={(e) => set({ faculty: e.target.value })} />
            </div>
            <div className="md:col-span-4">
              <label htmlFor="ev-kw" className="label">Keyword in the title or abstract</label>
              <input id="ev-kw" className="input" placeholder="e.g. cassava, malaria, machine learning" value={f.keyword} onChange={(e) => set({ keyword: e.target.value })} />
            </div>
          </div>
        </div>

        {/* What */}
        <div className="grid gap-4 border-t border-brand-primary/15 pt-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <label htmlFor="ev-partner" className="label">Joint papers with</label>
            <select id="ev-partner" className="input" value={f.partner} onChange={(e) => set({ partner: e.target.value })}>
              {PARTNERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="ev-home" className="label">Our country (code)</label>
            <input id="ev-home" className="input uppercase" maxLength={2} value={f.home} onChange={(e) => set({ home: e.target.value.replace(/[^a-z]/gi, '') })} />
          </div>
          <div>
            <label htmlFor="ev-target" className="label">Papers needed</label>
            <input id="ev-target" type="number" min={1} className="input" value={target} onChange={(e) => setTarget(Math.max(1, Number(e.target.value) || 1))} />
          </div>
          <div>
            <label htmlFor="ev-from" className="label">Published from (year)</label>
            <input id="ev-from" type="number" className="input" placeholder="e.g. 2020" value={f.yearFrom} onChange={(e) => set({ yearFrom: e.target.value })} />
          </div>
          <div>
            <label htmlFor="ev-to" className="label">Published to (year)</label>
            <input id="ev-to" type="number" className="input" placeholder="e.g. 2025" value={f.yearTo} onChange={(e) => set({ yearTo: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 pt-6 text-sm md:col-span-2">
            <input type="checkbox" className="h-4 w-4 accent-brand-primary" checked={f.withLink} onChange={(e) => set({ withLink: e.target.checked })} />
            Only papers that have a link
          </label>
        </div>

        {indexOptions.length > 0 && (
          <fieldset>
            <legend className="label">
              Published in international outlets: counts papers indexed in
              <span className="ml-2 text-xs font-normal text-brand-ink/60">(none ticked = don’t filter)</span>
            </legend>
            <div className="mb-2 flex gap-2">
              <button type="button" className="btn-ghost !px-2.5 !py-1 !text-xs" onClick={() => set({ indexed: indexOptions.filter((o) => !NOT_INTERNATIONAL.test(o)) })}>International only</button>
              <button type="button" className="btn-ghost !px-2.5 !py-1 !text-xs" onClick={() => set({ indexed: [] })}>Clear</button>
            </div>
            <div className="grid gap-x-4 gap-y-1 rounded-md border border-brand-ink/20 bg-white p-3 sm:grid-cols-2 lg:grid-cols-3">
              {indexOptions.map((o) => (
                <label key={o} className="flex min-h-[36px] items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-brand-primary" checked={f.indexed.includes(o)} onChange={() => toggleIndexed(o)} /> {o}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" disabled={state.loading}>
            {state.loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Find papers
          </button>
          <button type="button" className="btn-ghost" onClick={resetFilters}>Reset filters</button>
        </div>
      </form>

      <ErrorBox>{state.error}</ErrorBox>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* Results */}
        <section aria-live="polite" className="order-last lg:order-none">
          <p className="mb-2 text-sm">
            {state.loading ? 'Searching…' : `${rows.length} matching paper${rows.length === 1 ? '' : 's'}`}
            {state.searched && !state.loading && rows.length < target && (
              <span className="ml-1 font-medium text-amber-800">– fewer than the {target} needed. Loosen the filters, or make sure staff fill in co-author countries and “Indexed in”.</span>
            )}
          </p>
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.id} className={`card flex gap-3 p-3 ${selected.has(r.id) ? 'ring-2 ring-brand-primary' : ''}`}>
                <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-brand-primary" checked={selected.has(r.id)}
                  disabled={!r.publication_link} onChange={() => toggle(r.id)} aria-label={`Select ${r.title}`} />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold leading-snug">{r.title}</p>
                  <p className="text-brand-ink/80">{r.staff.name} · PF {r.staff.pf_number} · {r.publication_year}{r.journal ? ` · ${r.journal}` : ''}</p>
                  <p className="mt-1 flex flex-wrap gap-1.5">
                    {r.partners.map((c) => <span key={c} className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">{countryName(c)}</span>)}
                    {r.indexed_in.map((x) => <span key={x} className="rounded-full bg-brand-light px-2 py-0.5 text-xs font-medium text-brand-700">{x}</span>)}
                  </p>
                  {r.publication_link
                    ? <a className="mt-1 inline-flex items-center gap-1 break-all font-medium text-brand-700 hover:underline" href={r.publication_link} target="_blank" rel="noreferrer">{r.publication_link} <ExternalLink size={12} aria-hidden /></a>
                    : <p className="mt-1 text-xs text-red-700">No link recorded, so it can’t be selected.</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Your answer */}
        <aside className="card order-first h-fit p-4 lg:order-none lg:sticky lg:top-4">
          <h3 className="text-base font-semibold">Your answer</h3>
          <p className={`mt-1 text-sm font-medium ${reached ? 'text-green-800' : ''}`}>{count} of {target} links selected{reached ? ' ✓' : ''}</p>
          <div className="mt-2 h-2 rounded-full bg-brand-light" role="progressbar" aria-valuenow={Math.min(count, target)} aria-valuemin={0} aria-valuemax={target} aria-label="Links selected">
            <div className={`h-2 rounded-full ${reached ? 'bg-green-600' : 'bg-brand-primary'}`} style={{ width: `${Math.min(100, (count / target) * 100)}%` }} />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-ghost !px-2.5 !py-1.5 !text-xs" onClick={() => setSelected(new Set(selectable.slice(0, target).map((r) => r.id)))}>Select first {target}</button>
            <button type="button" className="btn-ghost !px-2.5 !py-1.5 !text-xs" onClick={() => setSelected(new Set(selectable.map((r) => r.id)))}>Select all</button>
            <button type="button" className="btn-ghost !px-2.5 !py-1.5 !text-xs" onClick={() => setSelected(new Set())}>Clear</button>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <button type="button" className="btn-primary" disabled={!count} onClick={() => copy(plainText, 'plain')}>
              {copied === 'plain' ? <Check size={16} /> : <ClipboardCopy size={16} />} {copied === 'plain' ? 'Copied!' : 'Copy links'}
            </button>
            <button type="button" className="btn-ghost" disabled={!count} onClick={() => copy(titledText, 'titled')}>
              {copied === 'titled' ? <Check size={16} /> : <ClipboardCopy size={16} />} {copied === 'titled' ? 'Copied!' : 'Copy with titles'}
            </button>
          </div>

          {count > 0 && (
            <textarea readOnly rows={6} className="input mt-3 text-xs" aria-label="Selected links" value={plainText} onFocus={(e) => e.target.select()} />
          )}
        </aside>
      </div>
    </div>
  );
}