import { Chapter, Note } from '../components/Chapter.js';

export function Send() {
  return (
    <Chapter
      roman="III"
      title="Send."
      subtitle="Address an envelope. Choose its contents. Seal."
      marginalia={<Note>The composer is the next leaf to be set. Plan 3d.</Note>}
    >
      <p className="prose prose--lead dropcap">
        The composer is not yet bound. When it lands you will write to a
        named correspondent, attach a file, and the envelope will travel
        sealed.
      </p>
    </Chapter>
  );
}
