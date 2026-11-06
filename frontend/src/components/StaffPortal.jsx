import { Loader2, LogOut } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import StaffLogin from './StaffLogin.jsx';
import ChangePassword from './ChangePassword.jsx';
import PublicationSubmission from './PublicationSubmission.jsx';

/** The "Submit a publication" tab: login → (forced password change) → form. */
export default function StaffPortal() {
  const { staff, ready, logout } = useAuth();

  if (!ready) return <p className="flex items-center gap-2 text-sm"><Loader2 className="animate-spin" size={16} /> Loading…</p>;
  if (!staff) return <StaffLogin />;
  if (staff.must_change_password) return <ChangePassword forced />;

  return (
    <div>
      <div className="mx-auto mb-4 flex max-w-3xl items-center justify-between text-sm">
        <span>Signed in as <strong>{staff.name}</strong> (PF {staff.pf_number})</span>
        <button className="btn-ghost" onClick={() => logout('staff')}><LogOut size={14} /> Sign out</button>
      </div>
      <PublicationSubmission staff={staff} endpoint="/publications" />
    </div>
  );
}
