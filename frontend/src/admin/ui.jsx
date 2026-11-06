import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-brand-ink/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`my-4 w-full sm:my-8 ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-lg bg-brand-light shadow-xl`}>
        <div className="flex items-center justify-between border-b border-brand-primary/20 p-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export const ErrorBox = ({ children }) =>
  children ? <p role="alert" className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-800">{children}</p> : null;

export const OkBox = ({ children }) =>
  children ? <p role="status" className="mb-3 rounded-md bg-green-50 p-3 text-sm text-green-900">{children}</p> : null;

export function Pager({ page, last, onPage }) {
  if (!last || last <= 1) return null;
  return (
    <nav className="mt-4 flex items-center justify-center gap-3" aria-label="Pagination">
      <button className="btn-ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={16} /> Previous</button>
      <span className="text-sm">Page {page} of {last}</span>
      <button className="btn-ghost" disabled={page >= last} onClick={() => onPage(page + 1)}>Next <ChevronRight size={16} /></button>
    </nav>
  );
}
