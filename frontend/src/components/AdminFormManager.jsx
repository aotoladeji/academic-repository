import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Save, X } from 'lucide-react';
import api, { errorMessage } from '../lib/api.js';
import DynamicFormBuilder from './DynamicFormBuilder.jsx';

const TYPES = [
  ['text', 'Short text'], ['textarea', 'Long text'], ['select', 'Dropdown'], ['date', 'Date'],
  ['url', 'Link'], ['number', 'Number'], ['dynamic_list', 'Repeatable list'],
];
const EMPTY = { label: '', type: 'text', is_required: false, is_active: true, optionsText: '' };

export default function AdminFormManager() {
  const [fields, setFields] = useState([]);
  const [draft, setDraft] = useState(EMPTY);
  const [editing, setEditing] = useState(null); // FormField | null
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/form-fields');
      setFields(data.data);
    } catch (e) {
      setError(errorMessage(e, 'Could not load fields.'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const startEdit = (f) => {
    setEditing(f);
    setDraft({ label: f.label, type: f.type, is_required: f.is_required, is_active: f.is_active, optionsText: (f.options ?? []).join('\n') });
  };
  const reset = () => { setEditing(null); setDraft(EMPTY); };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    const options = draft.type === 'select'
      ? draft.optionsText.split('\n').map((s) => s.trim()).filter(Boolean)
      : null;
    if (draft.type === 'select' && !options.length) return setError('Add at least one dropdown option.');

    const payload = { label: draft.label.trim(), type: draft.type, is_required: draft.is_required, is_active: draft.is_active, options };
    setSaving(true);
    try {
      if (editing) {
        const { data } = await api.put(`/admin/form-fields/${editing.id}`, payload);
        setFields((fs) => fs.map((f) => (f.id === editing.id ? data.data : f)));
      } else {
        const { data } = await api.post('/admin/form-fields', payload);
        setFields((fs) => [...fs, data.data]);
      }
      reset();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const reorder = async (next) => {
    const previous = fields;
    setFields(next); // optimistic
    try {
      await api.put('/admin/form-fields/reorder', { ids: next.map((f) => f.id) });
    } catch (err) {
      setFields(previous);
      setError(errorMessage(err, 'Could not save the new order.'));
    }
  };

  const toggle = async (field, key) => {
    const value = !field[key];
    setFields((fs) => fs.map((f) => (f.id === field.id ? { ...f, [key]: value } : f)));
    try {
      await api.put(`/admin/form-fields/${field.id}`, { [key]: value });
    } catch (err) {
      setFields((fs) => fs.map((f) => (f.id === field.id ? { ...f, [key]: !value } : f)));
      setError(errorMessage(err));
    }
  };

  const remove = async (field) => {
    if (!window.confirm(`Delete “${field.label}”? Values already saved on publications are kept but no longer shown.`)) return;
    try {
      await api.delete(`/admin/form-fields/${field.id}`);
      setFields((fs) => fs.filter((f) => f.id !== field.id));
      if (editing?.id === field.id) reset();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section aria-labelledby="builder-h">
        <h2 id="builder-h" className="mb-1 text-xl font-semibold">Submission form fields</h2>
        <p className="mb-4 text-sm text-brand-ink/70">
          Drag fields to reorder them. Staff always see title, abstract, date, DOI, link and co-authors; these fields appear after them.
        </p>
        {error && <p role="alert" className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {loading
          ? <p className="flex items-center gap-2 text-sm"><Loader2 className="animate-spin" size={16} /> Loading fields…</p>
          : <DynamicFormBuilder fields={fields} editingId={editing?.id} onReorder={reorder} onToggle={toggle} onEdit={startEdit} onDelete={remove} />}
      </section>

      <form onSubmit={save} className="card h-fit space-y-4 p-4" aria-labelledby="editor-h">
        <h2 id="editor-h" className="text-lg font-semibold">{editing ? 'Edit field' : 'Add a field'}</h2>

        <div>
          <label className="label" htmlFor="f-label">Label</label>
          <input id="f-label" className="input" required maxLength={255} value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="e.g. Journal name" />
        </div>

        <div>
          <label className="label" htmlFor="f-type">Field type</label>
          <select id="f-type" className="input" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {draft.type === 'select' && (
          <div>
            <label className="label" htmlFor="f-opts">Dropdown options (one per line)</label>
            <textarea id="f-opts" rows={4} className="input" value={draft.optionsText}
              onChange={(e) => setDraft({ ...draft, optionsText: e.target.value })} />
          </div>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-brand-primary" checked={draft.is_required}
            onChange={(e) => setDraft({ ...draft, is_required: e.target.checked })} />
          Staff must fill this in
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-brand-primary" checked={draft.is_active}
            onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} />
          Show on the submission form
        </label>

        <div className="flex gap-2">
          <button className="btn-primary flex-1" disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : editing ? <Save size={16} /> : <Plus size={16} />}
            {editing ? 'Save changes' : 'Add field'}
          </button>
          {editing && <button type="button" className="btn-ghost" onClick={reset}><X size={16} /> Cancel</button>}
        </div>
      </form>
    </div>
  );
}
