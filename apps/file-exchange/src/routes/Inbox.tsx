import { Chapter, Note } from '../components/Chapter.js';

export function Inbox() {
  return (
    <Chapter
      roman="I"
      title="Inbox."
      subtitle="Letters delivered, awaiting your hand."
      marginalia={<Note>The real inbox lands in Plan 3d. For now the binding is set; the pages are blank.</Note>}
    >
      <p className="prose prose--lead dropcap">
        Nothing has arrived yet. Envelopes addressed to you will appear here,
        decrypted only on this device — never on the way.
      </p>
    </Chapter>
  );
}
