import { Chapter, Note } from '../components/Chapter.js';

export function Outbox() {
  return (
    <Chapter
      roman="II"
      title="Outbox."
      subtitle="What you have written, kept here for the record."
      marginalia={<Note>Composer arrives in Plan 3d.</Note>}
    >
      <p className="prose prose--lead dropcap">
        Nothing dispatched yet. Each envelope you send will be listed here
        with its addressee and its fate.
      </p>
    </Chapter>
  );
}
