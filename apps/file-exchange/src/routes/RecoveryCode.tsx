import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Page } from '../components/Page.js';
import { Button } from '../components/Button.js';
import { Chapter, Note } from '../components/Chapter.js';
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
      <Chapter
        roman="Colophon"
        title="Your recovery code."
        subtitle="Inscribe it somewhere only you can reach. We keep no copy."
        marginalia={
          <>
            <Note>
              This is the single key that re-binds your account to a new
              device — irreplaceable, and never shown again.
            </Note>
            <Note>
              A printed page in a drawer is, by some measures, safer than
              any cloud.
            </Note>
          </>
        }
      >
        <p className="prose prose--lead dropcap">
          What follows is the only string of characters that can recover this
          account on another machine. Write it down, or store it in a password
          manager. <strong>If you lose it, no-one can read your messages — not
          even us.</strong>
        </p>

        <div className="codex" data-label="Recovery code">
          <div
            className="codex__code"
            role="textbox"
            aria-readonly="true"
            aria-label="Recovery code"
          >
            {formatRecoveryCode(code)}
          </div>
        </div>

        <div className="actions" style={{ marginTop: '1.25rem' }}>
          <Button onClick={copy} variant="mark">{copied ? 'Copied' : 'Copy to clipboard'}</Button>
        </div>

        <label className="check">
          <input
            type="checkbox"
            checked={acked}
            onChange={(e) => setAcked(e.target.checked)}
          />
          <span>I have saved my recovery code in a place only I can reach.</span>
        </label>

        <div className="actions">
          <Button
            variant="press"
            disabled={!acked}
            onClick={() => navigate('/inbox', { replace: true })}
          >
            Continue to inbox
          </Button>
        </div>
      </Chapter>
    </Page>
  );
}
