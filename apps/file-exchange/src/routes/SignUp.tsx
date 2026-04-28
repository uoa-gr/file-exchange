import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Page } from '../components/Page.js';
import { Field } from '../components/Field.js';
import { Button } from '../components/Button.js';
import { Chapter, Note } from '../components/Chapter.js';
import { signUp } from '../auth/api.js';
import { getSupabaseClient, usernameAvailable } from '@liaskos/supabase-client';
import { useCryptoStore } from '../store/cryptoContext.js';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export function SignUp() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!username) { setUsernameError(''); return; }
    if (!USERNAME_RE.test(username)) {
      setUsernameError('3–20 chars, lowercase letters, digits, underscores.');
      return;
    }
    setUsernameError('');
    const t = setTimeout(async () => {
      try {
        const ok = await usernameAvailable(getSupabaseClient(), username);
        if (!ok) setUsernameError('Already taken.');
      } catch { /* network glitch — submit will re-check */ }
    }, 400);
    return () => clearTimeout(t);
  }, [username]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (usernameError) return;
    if (password.length < 12) { setError('Password must be at least 12 characters.'); return; }

    setPending(true);
    const r = await signUp(email, username, password);
    setPending(false);

    if (!r.ok) {
      switch (r.reason) {
        case 'email_in_use': setError('That email is already registered. Try signing in.'); break;
        case 'username_taken': setUsernameError('Already taken.'); break;
        case 'auth_error':
        case 'rpc_error': setError(r.message); break;
      }
      return;
    }

    useCryptoStore.getState().setUnlocked(r.privateKey, r.publicKey);
    navigate('/signup/recovery-code', { replace: true, state: { recoveryCodeHex: r.recoveryCodeHex } });
  }

  return (
    <Page>
      <Chapter
        roman="Chapter I"
        title="A new correspondent."
        subtitle="Choose a name; the keys are forged on this device."
        marginalia={
          <>
            <Note>
              Your username is your public address. Anyone may write to you;
              only you can read what arrives.
            </Note>
            <Note>
              Your password never leaves the page. We see ciphertext only.
            </Note>
            <Note>
              The next leaf shows your recovery code — the single key that
              opens this account on a new machine. Keep it as you would a
              house key.
            </Note>
          </>
        }
      >
        <p className="prose prose--lead dropcap">
          End-to-end encrypted file transfer between named people. The server
          carries envelopes between you and the person you write to; nobody —
          not even us — can read what is inside.
        </p>
        <form onSubmit={onSubmit} noValidate>
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            index="i."
          />
          <Field
            label="Username"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            error={usernameError || undefined}
            placeholder="3–20 characters · a–z 0–9 _"
            index="ii."
          />
          <Field
            label="Password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error || undefined}
            placeholder="at least twelve characters"
            index="iii."
          />
          <div className="actions">
            <Button type="submit" variant="press" disabled={pending}>
              {pending ? 'Forging keys…' : 'Open the account'}
            </Button>
            <Link to="/login" className="btn btn--ghost">Already have one</Link>
          </div>
        </form>
      </Chapter>
    </Page>
  );
}
