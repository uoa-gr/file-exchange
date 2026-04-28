import { type InputHTMLAttributes, useId } from 'react';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  /** Roman-numeral or letter index in the gutter (purely decorative). */
  index?: string;
  /** Use mono face — recovery codes, key fingerprints, etc. */
  mono?: boolean;
}

const ROMAN = ['', 'i.', 'ii.', 'iii.', 'iv.', 'v.', 'vi.', 'vii.', 'viii.', 'ix.', 'x.'];

let counter = 0;
const nextRoman = () => {
  counter = (counter % 10) + 1;
  return ROMAN[counter];
};

/**
 * Fill-in-the-blank register entry. Small-caps label, ink rule underneath
 * an unboxed input, decorative roman numeral in the gutter. Focus thickens
 * the rule and shifts it to accent — no jarring outline box.
 */
export function Field({
  label,
  error,
  id,
  index,
  mono,
  className = '',
  ...rest
}: FieldProps) {
  const auto = useId();
  const inputId = id ?? auto;
  const errId = error ? `${inputId}-err` : undefined;
  const gutterMark = index ?? nextRoman();
  return (
    <div
      className={`field ${mono ? 'field--mono' : ''} ${error ? 'field--error' : ''} ${className}`}
    >
      <span className="field__index" aria-hidden="true">{gutterMark}</span>
      <label htmlFor={inputId} className="field__label">{label}</label>
      <span className="field__input-wrap">
        <input
          {...rest}
          id={inputId}
          className="field__input"
          aria-invalid={Boolean(error)}
          aria-describedby={errId}
        />
      </span>
      {error && (
        <p id={errId} role="alert" className="field__error">{error}</p>
      )}
    </div>
  );
}
