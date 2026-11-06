import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Pencil, Trash2 } from 'lucide-react';

const TYPE_LABELS = {
  text: 'Short text', textarea: 'Long text', select: 'Dropdown', date: 'Date',
    url: 'Link', number: 'Number', dynamic_list: 'Repeatable list', multi_select: 'Multiple choice',
};

/**
 * Sortable list of form fields.
 * Mouse: drag the grip handle. Phone / keyboard: use the up/down arrow buttons.
 */
export default function DynamicFormBuilder({ fields, onReorder, onToggle, onEdit, onDelete, editingId }) {
  const dragIndex = useRef(null);
  const [overIndex, setOverIndex] = useState(null);

  const move = (from, to) => {
    if (to < 0 || to >= fields.length || from === to) return;
    const next = [...fields];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onReorder(next);
  };

  if (!fields.length) {
    return <p className="rounded-md border border-dashed border-brand-primary/40 p-6 text-center text-sm">
      No custom fields yet. Add one using the form to start building the submission form.
    </p>;
  }

  return (
    <ol className="space-y-2">
      {fields.map((f, i) => (
        <li
          key={f.id}
          draggable
          onDragStart={() => { dragIndex.current = i; }}
          onDragOver={(e) => { e.preventDefault(); setOverIndex(i); }}
          onDragLeave={() => setOverIndex(null)}
          onDrop={() => { move(dragIndex.current, i); dragIndex.current = null; setOverIndex(null); }}
          onDragEnd={() => { dragIndex.current = null; setOverIndex(null); }}
          className={`card flex flex-wrap items-center gap-x-2 gap-y-1 px-2 py-2 ${
            overIndex === i ? 'border-brand-primary ring-2 ring-brand-primary/40' : ''
          } ${editingId === f.id ? 'bg-brand-light' : ''} ${f.is_active ? '' : 'opacity-60'}`}
        >
          <span className="hidden cursor-grab text-brand-ink/40 sm:inline" aria-hidden title="Drag to reorder">
            <GripVertical size={18} />
          </span>

          <div className="min-w-0 flex-1 basis-40">
            <p className="truncate text-sm font-semibold">{f.label}</p>
            <p className="truncate text-xs text-brand-ink/70">
              {TYPE_LABELS[f.type]} · <code>{f.field_key}</code>
              {!f.is_active && ' · hidden from staff'}
            </p>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-1">
            <button
              type="button"
              role="switch"
              aria-checked={f.is_required}
              onClick={() => onToggle(f, 'is_required')}
              className={`rounded-full px-2.5 py-1.5 text-xs font-semibold ${
                f.is_required ? 'bg-brand-primary text-white' : 'bg-brand-light text-brand-ink/70'
              }`}
            >
              {f.is_required ? 'Required' : 'Optional'}
            </button>

            <button type="button" className="icon-btn" onClick={() => onToggle(f, 'is_active')}
              aria-label={f.is_active ? `Hide ${f.label}` : `Show ${f.label}`}>
              {f.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
            <button type="button" className="icon-btn" onClick={() => move(i, i - 1)} disabled={i === 0}
              aria-label={`Move ${f.label} up`}><ArrowUp size={16} /></button>
            <button type="button" className="icon-btn" onClick={() => move(i, i + 1)} disabled={i === fields.length - 1}
              aria-label={`Move ${f.label} down`}><ArrowDown size={16} /></button>
            <button type="button" className="icon-btn" onClick={() => onEdit(f)}
              aria-label={`Edit ${f.label}`}><Pencil size={16} /></button>
            <button type="button" className="icon-btn hover:!text-red-700" onClick={() => onDelete(f)}
              aria-label={`Delete ${f.label}`}><Trash2 size={16} /></button>
          </div>
        </li>
      ))}
    </ol>
  );
}