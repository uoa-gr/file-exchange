import { type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** press = primary cartouche; mark = small-caps under-rule; ghost = italic link */
  variant?: 'press' | 'mark' | 'ghost';
}

export function Button({
  variant = 'press',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button {...rest} className={`btn btn--${variant} ${className}`}>
      {children}
    </button>
  );
}
