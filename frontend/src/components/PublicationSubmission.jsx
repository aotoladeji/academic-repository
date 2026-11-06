import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { CheckCircle2, Loader2, Telescope, UserPlus, X } from 'lucide-react';
import api, { errorMessage } from '../lib/api.js';
import DynamicFormRenderer, { buildCustomDefaults, buildCustomSchema, serializeCustom } from './DynamicFormRenderer.jsx';
import SimilarPublicationsModal from './SimilarPublicationsModal.jsx';

const CORE_DEFAULTS = { title: '', abstract: '', publication_date: '', doi: '', url: '', co_authors: [] };

/**
 * Props:
 *  staff     the staff member the publication belongs to (the signed-in user, or the one an admin picked)
 *  endpoint  '/publications' (staff) or '/admin/publications' (administrator)
 *  onSaved   optional callback after a successful save
 */
export default function PublicationSubmission({ staff, endpoint = '/publications', onSaved }) {
  const [fields, setFields] = useState([]);
  const [formError, setFormError] = useState('');
  const [saved, setSaved] = useState(null);
  const [showSimilar, setShowSimilar] = useState(false);

  const schema = useMemo(() => yup.object({
    title: yup.string().trim().required('Title is required').max(500),
    abstract: yup.string().notRequired(),
    publication_date: yup.string().required('Publication date is required')
      .test('not-future', 'Date cannot be in the future', (v) => !v || new Date(v) <= new Date()),
    doi: yup.string().notRequired().matches(/^(10\.\d{4,9}\/\S+)?$/, 'Use the bare DOI, e.g. 10.1234/abcd.5678'),
    url: yup.string().url('Enter a full link, e.g. https://…').notRequired(),
    co_authors: yup.array().of(yup.object({
      name: yup.string().trim().required('Name is required'),
      affiliation: yup.string().notRequired(),
      email: yup.string().email('Enter a valid email').notRequired(),
    })),
    custom: buildCustomSchema(fields),
  }), [fields]);

  const { register, control, handleSubmit, reset, setError, getValues, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { ...CORE_DEFAULTS, custom: {} },
  });
  const { fields: authors, append, remove } = useFieldArray({ control, name: 'co_authors' });

  useEffect(() => {
    api.get('/form-fields').then(({ data }) => {
      setFields(data.data);
      reset({ ...getValues(), custom: buildCustomDefaults(data.data) });
    }).catch((e) => setFormError(errorMessage(e, 'Could not load the form fields.')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (values) => {
    setFormError('');
    try {
      const { data } = await api.post(endpoint, {
        staff_id: staff.id, // the server ignores this for staff and uses the signed-in account
        title: values.title.trim(),
        abstract: values.abstract || null,
        publication_date: values.publication_date,
        doi: values.doi || null,
        url: values.url || null,
        co_authors: values.co_authors,
        custom: serializeCustom(fields, values.custom),
      });
      setSaved(data.data);
      onSaved?.(data.data);
    } catch (e) {
      const serverErrors = e?.response?.data?.errors;
      if (serverErrors) Object.entries(serverErrors).forEach(([k, m]) => setError(k, { message: m[0] }));
      setFormError(errorMessage(e));
    }
  };

  const startOver = () => {
    setSaved(null);
    reset({ ...CORE_DEFAULTS, custom: buildCustomDefaults(fields) });
  };

  if (saved) {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <CheckCircle2 className="mx-auto text-brand-primary" size={40} aria-hidden />
        <h2 className="mt-3 text-2xl font-semibold">Publication saved</h2>
        <p className="mt-2 text-sm">“{saved.title}” is now in the repository.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button className="btn-primary" onClick={() => setShowSimilar(true)}><Telescope size={16} /> Check for similar publications</button>
          <button className="btn-ghost" onClick={startOver}>Submit another</button>
        </div>
        <SimilarPublicationsModal open={showSimilar} onClose={() => setShowSimilar(false)} title={saved.title} doi={saved.doi} />
      </div>
    );
  }

  const err = (name) => errors[name]?.message && <p className="error-text">{errors[name].message}</p>;
  const cls = (name) => `input ${errors[name] ? 'input-error' : ''}`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mx-auto max-w-3xl space-y-6">
      {formError && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{formError}</p>}

      <section className="card p-5" aria-labelledby="staff-h">
        <h2 id="staff-h" className="mb-3 text-xl font-semibold">Author details</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {[['PF number', 'pf_number'], ['Name', 'name'], ['Department', 'department'], ['Faculty', 'faculty'], ['Designation', 'designation']].map(([l, k]) => (
            <div key={k}>
              <label className="label" htmlFor={`s-${k}`}>{l}</label>
              <input id={`s-${k}`} className="input" disabled value={staff?.[k] ?? ''} />
            </div>
          ))}
        </div>
      </section>

      <section className="card space-y-4 p-5" aria-labelledby="pub-h">
        <h2 id="pub-h" className="text-xl font-semibold">Publication</h2>
        <div>
          <label htmlFor="title" className="label">Title <span className="text-red-700">*</span></label>
          <input id="title" className={cls('title')} {...register('title')} />
          {err('title')}
        </div>
        <div>
          <label htmlFor="abstract" className="label">Abstract</label>
          <textarea id="abstract" rows={5} className={cls('abstract')} {...register('abstract')} />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="pdate" className="label">Publication date <span className="text-red-700">*</span></label>
            <input id="pdate" type="date" className={cls('publication_date')} {...register('publication_date')} />
            {err('publication_date')}
          </div>
          <div>
            <label htmlFor="doi" className="label">DOI</label>
            <input id="doi" className={cls('doi')} placeholder="10.1234/abcd.5678" {...register('doi')} />
            {err('doi')}
          </div>
          <div>
            <label htmlFor="url" className="label">Link</label>
            <input id="url" type="url" className={cls('url')} placeholder="https://" {...register('url')} />
            {err('url')}
          </div>
        </div>
      </section>

      <section className="card p-5" aria-labelledby="co-h">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="co-h" className="text-xl font-semibold">Co-authors and contributors</h2>
          <button type="button" className="btn-ghost" onClick={() => append({ name: '', affiliation: '', email: '' })}>
            <UserPlus size={16} /> Add co-author
          </button>
        </div>
        {!authors.length && <p className="text-sm text-brand-ink/70">Sole author. Add co-authors if others contributed.</p>}
        <div className="space-y-3">
          {authors.map((a, i) => (
            <div key={a.id} className="grid items-start gap-2 md:grid-cols-[1.2fr_1.2fr_1fr_auto]">
              <div>
                <input className={`input ${errors.co_authors?.[i]?.name ? 'input-error' : ''}`} aria-label={`Co-author ${i + 1} name`} placeholder="Full name" {...register(`co_authors.${i}.name`)} />
                {errors.co_authors?.[i]?.name && <p className="error-text">{errors.co_authors[i].name.message}</p>}
              </div>
              <input className="input" aria-label={`Co-author ${i + 1} affiliation`} placeholder="Institution" {...register(`co_authors.${i}.affiliation`)} />
              <div>
                <input type="email" className={`input ${errors.co_authors?.[i]?.email ? 'input-error' : ''}`} aria-label={`Co-author ${i + 1} email`} placeholder="Email (optional)" {...register(`co_authors.${i}.email`)} />
                {errors.co_authors?.[i]?.email && <p className="error-text">{errors.co_authors[i].email.message}</p>}
              </div>
              <button type="button" className="icon-btn mt-1" onClick={() => remove(i)} aria-label={`Remove co-author ${i + 1}`}><X size={16} /></button>
            </div>
          ))}
        </div>
      </section>

      {fields.length > 0 && (
        <section className="card p-5" aria-labelledby="more-h">
          <h2 id="more-h" className="mb-3 text-xl font-semibold">Additional information</h2>
          <DynamicFormRenderer fields={fields} register={register} control={control} errors={errors} />
        </section>
      )}

      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting && <Loader2 size={16} className="animate-spin" />} Submit publication
        </button>
      </div>
    </form>
  );
}
