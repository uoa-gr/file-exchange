import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Page, PageTitle, PageHelper } from '../components/Page.js';
import { Field } from '../components/Field.js';
import { Button } from '../components/Button.js';
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
          setError('Your keys live on the device where you signed up. Use your recovery code to set up this one.');
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
      <PageTitle>Sign in</PageTitle>
      <PageHelper>End-to-end encrypted. Your password decrypts your keys on this device.</PageHelper>
      <form onSubmit={onSubmit} className="form" noValidate>
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error || undefined}
        />
        <Button type="submit" disabled={pending}>
          {pending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <p className="linkrow">
        New here?<Link to="/signup">Create an account</Link>
        {needsRecovery && <Link to="/recovery">Use recovery code</Link>}
      </p>
    </Page>
  );
}
