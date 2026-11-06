import { Globe2, Handshake, HelpCircle, User } from 'lucide-react';

const META = {
  africa: { label: 'Collaboration within Africa', Icon: Handshake, cls: 'bg-emerald-100 text-emerald-900' },
  global: { label: 'Global collaboration', Icon: Globe2, cls: 'bg-sky-100 text-sky-900' },
  sole: { label: 'No co-authors', Icon: User, cls: 'bg-gray-100 text-gray-700' },
  unknown: { label: 'Collaboration not specified', Icon: HelpCircle, cls: 'bg-gray-100 text-gray-700' },
};

/** scope: 'africa' | 'global' | 'sole' | 'unknown' */
export default function CollaborationBadge({ scope = 'sole', className = '' }) {
  const { label, Icon, cls } = META[scope] ?? META.unknown;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cls} ${className}`}>
      <Icon size={13} aria-hidden /> {label}
    </span>
  );
}