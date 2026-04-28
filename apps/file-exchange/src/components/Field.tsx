import { type InputHTMLAttributes, useId } from 'react';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  /** Use mono face — recovery codes, key fingerprints, etc. */
  mono?: boolean;
}

/**
 * Mobile-first labelled input. Single bordered box, no decorative
 * indices. Focus shifts the border to the accent color.
 */
export function Field({
  label,
  error,
  hint,
  id,
  mono,
  ...rest
}: FieldProps) {
  const auto = useId();
  const inputId = id ?? auto;
  const errId = error ? `${inputId}-err` : undefined;
  const hintId = hint && !error ? `${inputId}-hint` : undefined;
  return (
    <div className={`field ${mono ? 'field--mono' : ''} ${error ? 'field--error' : ''}`}>
      <label htmlFor={inputId} className="field__label">{label}</label>
      <input
        {...rest}
        id={inputId}
        className="field__input"
        aria-invalid={Boolean(error)}
        aria-describedby={errId ?? hintId}
      />
      {error
        ? <p id={errId} role="alert" className="field__error">{error}</p>
        : hint
        ? <p id={hintId} className="field__hint">{hint}</p>
        : null}
    </div>
  );
}
