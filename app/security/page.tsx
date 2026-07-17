import { redirect } from 'next/navigation';

// /security previously hosted a static, disconnected vulnerability dashboard
// with no backing data. War Room is now the single governed reliability
// surface (real incidents, worker fleet, queue pressure, recovery actions).
// This route stays only so old links and the README's documented behavior
// keep working.
export default function SecurityRedirectPage() {
  redirect('/war-room');
}
