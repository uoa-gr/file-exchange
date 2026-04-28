import { type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'ghost';
}

export function Button({
  variant = 'solid',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const v = variant === 'ghost' ? 'btn btn--ghost' : 'btn';
  return (
    <button {...rest} className={`${v} ${className}`.trim()}>
      {children}
    </button>
  );
}
