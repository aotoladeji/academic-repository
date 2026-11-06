import * as yup from 'yup';
import { Controller, useFieldArray } from 'react-hook-form';
import { Plus, X } from 'lucide-react';

/* ---------- helpers shared with the parent form ---------- */

/** yup schema for the admin-defined fields; nest under `custom` in the parent schema. */
export function buildCustomSchema(fields) {
  const shape = {};
  fields.forEach((f) => {
    const req = f.is_required ? `${f.label} is required` : null;
    let s;
    switch (f.type) {
      case 'number':
        s = yup.number().transform((v, o) => (o === '' || o == null ? undefined : v)).typeError(`${f.label} must be a number`);
        break;
      case 'url':
        s = yup.string().url('Enter a full link, e.g. https://example.org/paper');
        break;
      case 'select':
        s = yup.string().oneOf(['', ...(f.options ?? [])], 'Choose one of the listed options');
        break;
      case 'multi_select':
        s = yup.array().of(yup.string());
        if (req) s = s.min(1, req);
        shape[f.field_key] = s;
        return;
      case 'dynamic_list':
        s = yup.array().of(yup.object({ value: yup.string() }));
        if (req) s = s.test('min1', req, (arr) => (arr ?? []).some((i) => i.value?.trim()));
        shape[f.field_key] = s;
        return;
      default:
        s = yup.string().max(f.type === 'textarea' ? 5000 : 255);
    }
    shape[f.field_key] = req ? s.required(req) : s.notRequired();
  });
  return yup.object(shape);
}

export function buildCustomDefaults(fields) {
  return Object.fromEntries(fields.map((f) => [
    f.field_key,
    f.type === 'dynamic_list' ? [{ value: '' }] : f.type === 'multi_select' ? [] : '',
  ]));
}

/** Turn form state into the API shape ({ dynamic_list: ['a','b'] }, blanks removed). */
export function serializeCustom(fields, values = {}) {
  const out = {};
  fields.forEach((f) => {
    const v = values[f.field_key];
    if (f.type === 'dynamic_list') out[f.field_key] = (v ?? []).map((i) => i.value?.trim()).filter(Boolean);
    else if (f.type === 'multi_select') out[f.field_key] = Array.isArray(v) ? v : [];
    else if (v !== '' && v != null && !Number.isNaN(v)) out[f.field_key] = v;
  });
  return out;
}

/* ---------- renderer ---------- */

/**
 * Renders admin-defined fields from API metadata.
 * Must be used inside a react-hook-form context; pass in register/control/errors from useForm.
 */
export default function DynamicFormRenderer({ fields, register, control, errors, prefix = 'custom' }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {fields.map((f) => (
        <div key={f.id} className={['textarea', 'dynamic_list', 'multi_select'].includes(f.type) ? 'md:col-span-2' : ''}>
          <FieldControl field={f} register={register} control={control} error={errors?.[prefix]?.[f.field_key]} name={`${prefix}.${f.field_key}`} />
        </div>
      ))}
    </div>
  );
}

function FieldControl({ field: f, register, control, error, name }) {
  if (f.type === 'dynamic_list') return <ListControl field={f} control={control} register={register} name={name} error={error} />;
  if (f.type === 'multi_select') return <MultiSelectControl field={f} control={control} name={name} error={error} />;

  const id = `cf-${f.field_key}`;
  const cls = `input ${error ? 'input-error' : ''}`;
  const common = { id, 'aria-invalid': !!error, ...register(name) };

  let input;
  switch (f.type) {
    case 'textarea': input = <textarea rows={4} className={cls} {...common} />; break;
    case 'select':
      input = (
        <select className={cls} {...common}>
          <option value="">Select…</option>
          {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
      break;
    case 'date': input = <input type="date" className={cls} {...common} />; break;
    case 'url': input = <input type="url" inputMode="url" placeholder="https://" className={cls} {...common} />; break;
    case 'number': input = <input type="number" step="any" className={cls} {...common} />; break;
    default: input = <input type="text" className={cls} {...common} />;
  }

  return (
    <>
      <label htmlFor={id} className="label">{f.label}{f.is_required && <span className="text-red-700"> *</span>}</label>
      {input}
      {error?.message && <p className="error-text">{error.message}</p>}
    </>
  );
}

/** Tick every option that applies. Value is an array of the ticked option texts. */
function MultiSelectControl({ field: f, control, name, error }) {
  return (
    <Controller
      control={control}
      name={name}
      defaultValue={[]}
      render={({ field }) => {
        const value = Array.isArray(field.value) ? field.value : [];
        const toggle = (opt) => field.onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
        return (
          <fieldset>
            <legend className="label">
              {f.label}{f.is_required && <span className="text-red-700"> *</span>}
              <span className="ml-2 text-xs font-normal text-brand-ink/60">tick all that apply</span>
            </legend>
            <div className={`grid gap-x-4 gap-y-1 rounded-md border bg-white p-3 sm:grid-cols-2 ${error ? 'border-red-500' : 'border-brand-ink/20'}`}>
              {(f.options ?? []).map((opt) => (
                <label key={opt} className="flex min-h-[36px] items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-brand-primary" checked={value.includes(opt)} onChange={() => toggle(opt)} />
                  {opt}
                </label>
              ))}
            </div>
            {error?.message && <p className="error-text">{error.message}</p>}
          </fieldset>
        );
      }}
    />
  );
}

function ListControl({ field: f, control, register, name, error }) {
  const { fields: rows, append, remove } = useFieldArray({ control, name });
  return (
    <fieldset>
      <legend className="label">{f.label}{f.is_required && <span className="text-red-700"> *</span>}</legend>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={row.id} className="flex gap-2">
            <input className="input" aria-label={`${f.label} ${i + 1}`} {...register(`${name}.${i}.value`)} />
            <button type="button" className="icon-btn" onClick={() => remove(i)} disabled={rows.length === 1} aria-label={`Remove ${f.label} ${i + 1}`}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="btn-ghost mt-2" onClick={() => append({ value: '' })}><Plus size={14} /> Add another</button>
      {error?.message && <p className="error-text">{error.message}</p>}
    </fieldset>
  );
}