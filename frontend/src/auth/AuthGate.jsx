import { useState } from 'react';
import { useAuth } from './auth-context';

const inputClass = 'mt-2 w-full min-w-0 rounded-xl border border-white/20 bg-black/30 px-4 py-3 text-white outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/30';
const buttonClass = 'w-full rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white hover:bg-orange-500 disabled:opacity-50';

function SignInForm() {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try { await auth.signIn(email, password); }
    catch (problem) { setError(problem.message); }
    finally { setPassword(''); setBusy(false); }
  }

  return <form onSubmit={submit} className="space-y-5">
    <p className="text-sm text-white/65">Sign in with your RAK Church account.</p>
    <label className="block text-sm font-medium" htmlFor="bookstore-email">Email
      <input id="bookstore-email" name="email" type="email" autoComplete="username" required maxLength={254}
        value={email} onChange={event => setEmail(event.target.value)} className={inputClass} disabled={busy} />
    </label>
    <label className="block text-sm font-medium" htmlFor="bookstore-password">Password
      <input id="bookstore-password" name="password" type="password" autoComplete="current-password" required maxLength={1024}
        value={password} onChange={event => setPassword(event.target.value)} className={inputClass} disabled={busy} />
    </label>
    {(error || auth.message) && <p role="alert" className="rounded-xl bg-red-500/15 p-3 text-sm text-red-200">{error || auth.message}</p>}
    <button type="submit" className={buttonClass} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    <p className="text-xs leading-relaxed text-white/50">Bookstore access is assigned by an administrator. Contact your administrator if you need access or help with your password.</p>
  </form>;
}

function ChangePasswordForm() {
  const auth = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (newPassword !== confirmation) { setError('The new passwords do not match.'); return; }
    setBusy(true);
    setError('');
    try { await auth.changePassword(currentPassword, newPassword); }
    catch (problem) { setError(problem.message); }
    finally { setCurrentPassword(''); setNewPassword(''); setConfirmation(''); setBusy(false); }
  }

  return <form onSubmit={submit} className="space-y-5">
    <p className="text-sm text-white/65">Change your temporary password before using the bookstore. This updates your RAK Church account across all platforms.</p>
    <input name="username" autoComplete="username" value={auth.user?.email || ''} readOnly hidden />
    {[
      ['current-password', 'Current password', currentPassword, setCurrentPassword, 'current-password'],
      ['new-password', 'New password', newPassword, setNewPassword, 'new-password'],
      ['confirm-password', 'Confirm new password', confirmation, setConfirmation, 'new-password'],
    ].map(([id, label, value, setter, autoComplete]) => <label key={id} htmlFor={id} className="block text-sm font-medium">{label}
      <input id={id} name={id} type="password" autoComplete={autoComplete} required minLength={id === 'current-password' ? 1 : 8} maxLength={128}
        value={value} onChange={event => setter(event.target.value)} className={inputClass} disabled={busy} />
    </label>)}
    {error && <p role="alert" className="text-sm text-red-200">{error}</p>}
    <button type="submit" disabled={busy} className={buttonClass}>{busy ? 'Updating…' : 'Update password'}</button>
    <button type="button" onClick={auth.signOut} disabled={busy} className="w-full py-2 text-sm text-white/65 hover:text-white">Sign out</button>
  </form>;
}

export default function AuthGate({ children }) {
  const auth = useAuth();
  if (auth.status === 'authenticated') return children;
  return <div className="relative flex min-h-dvh items-center justify-center bg-black bg-cover bg-center p-4 text-white" style={{ backgroundImage: "url('/desert2.jpg')" }}>
    <div className="absolute inset-0 bg-black/50" />
    <main className="relative w-full max-w-md rounded-3xl border border-white/20 bg-black/65 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
      <img src="/logo_transp.png" alt="RAK Church" className="mb-4 h-14 w-auto" />
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{auth.status === 'password-required' ? 'Set your password' : 'RAK Church Bookstore'}</h1>
      {['loading', 'signing-out'].includes(auth.status) ? <p role="status" className="text-white/65">{auth.status === 'signing-out' ? 'Signing out…' : 'Checking your session…'}</p>
        : auth.status === 'password-required' ? <ChangePasswordForm />
          : auth.status === 'unavailable' ? <div className="space-y-5">
            <p role="alert" className="text-sm text-red-200">{auth.message || 'Unable to verify your access. Please retry.'}</p>
            <button onClick={auth.refresh} className={buttonClass}>Retry</button>
            <button onClick={auth.signOut} className="w-full py-2 text-sm text-white/65">Sign out</button>
          </div> : <SignInForm />}
    </main>
  </div>;
}
