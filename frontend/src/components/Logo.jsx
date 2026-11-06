/** The university crest. Size it from outside with className, e.g. "h-10 w-auto". */
export default function Logo({ className = 'h-10 w-auto', alt = 'University crest' }) {
  return <img src="/logo.png" alt={alt} className={className} decoding="async" />;
}