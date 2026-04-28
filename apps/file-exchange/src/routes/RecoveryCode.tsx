import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Page, PageTitle, PageHelper } from '../components/Page.js';
import { Button } from '../components/Button.js';
import { formatRecoveryCode } from '../auth/crypto-binding.js';

interface State { recoveryCodeHex?: string }

export function RecoveryCode() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const code = (state as State)?.recoveryCodeHex;

  const [acked, setAcked] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!code) {
    navigate('/inbox', { replace: true });
    return null;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(code!);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback: select & copy manually */ }
  }

  return (
    <Page>
      <PageTitle>Save your recovery code</PageTitle>
      <PageHelper>
        This is the only way to recover your account if you forget your password. We can’t reset it for you.
      </PageHelper>

      <div
        className="code-box"
        role="textbox"
        aria-readonly="true"
        aria-label="Recovery code"
      >
        {formatRecoveryCode(code)}
      </div>

      <Button onClick={copy} variant="ghost">
        {copied ? 'Copied' : 'Copy to clipboard'}
      </Button>

      <label className="check">
        <input
          type="checkbox"
          checked={acked}
          onChange={(e) => setAcked(e.target.checked)}
        />
        <span>I’ve saved my recovery code somewhere safe.</span>
      </label>

      <Button
        disabled={!acked}
        onClick={() => navigate('/inbox', { replace: true })}
      >
        Continue
      </Button>
    </Page>
  );
}
