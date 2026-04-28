import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Page } from '../components/Page.js';
import { Field } from '../components/Field.js';
import { Button } from '../components/Button.js';
import { Chapter, Note } from '../components/Chapter.js';
import { signInPassword } from '../auth/api.js';
import { useCryptoStore } from '../store/cryptoContext.js';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>('');
  const [needsRecovery, setNeedsRecovery] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setPending(true);
    const r = await signInPassword(email, password);
    setPending(false);

    if (!r.ok) {
      switch (r.reason) {
        case 'wrong_password':
          setError('Password didn’t match.');
          break;
        case 'no_keys_on_device':
          setNeedsRecovery(true);
          setError('Your encryption keys live on the device where you signed up. Use your recovery code to set up this one.');
          break;
        case 'auth_error':
          setError(r.message);
          break;
        case 'rpc_error':
          setError('Couldn’t reach the server. Try again.');
          break;
      }
      return;
    }

    useCryptoStore.getState().setUnlocked(r.privateKey, r.publicKey);
    navigate('/inbox', { replace: true });
  }

  return (
    <Page>
      <Chapter
        roman="Frontispiece"
        title="Sign in."
        subtitle="Re-open your correspondence."
        marginalia={
          <>
            <Note>
              File Exchange does not hold your messages in plain. Without your
              password the server stores nothing it can read.
            </Note>
            <Note>
              First time on this machine? Use your recovery code instead.
            </Note>
          </>
        }
      >
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
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error || undefined}
            index="ii."
          />
          <div className="actions">
            <Button type="submit" variant="press" disabled={pending}>
              {pending ? 'Signing in…' : 'Sign in'}
            </Button>
            <Link to="/signup" className="btn btn--ghost">Open a new account</Link>
            {needsRecovery && (
              <Link to="/recovery" className="btn btn--ghost">Use recovery code</Link>
            )}
          </div>
        </form>
      </Chapter>
    </Page>
  );
}
