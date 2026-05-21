import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

type Variant = 'primary' | 'dark' | 'ghost' | 'outline';

const variantStyles: Record<Variant, string> = {
  primary: 'bg-accent-lime text-fg-primary hover:brightness-95',
  dark: 'bg-fg-primary text-fg-inverse hover:brightness-110',
  ghost: 'bg-transparent text-fg-muted hover:text-fg-secondary',
  outline: 'bg-surface-card text-fg-primary border border-border-soft hover:bg-surface-secondary/40',
};

type Props = {
  children: ReactNode;
  variant?: Variant;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  to?: string;
  onClick?: () => void;
  className?: string;
  size?: 'md' | 'sm';
  type?: 'button' | 'submit';
  disabled?: boolean;
};

// Mirrors XhQ5q (primary lime) and X5hVP (dark) components from the .pen.
export function Button({
  children,
  variant = 'primary',
  icon: IconLeft,
  iconRight: IconRight,
  to,
  onClick,
  className = '',
  size = 'md',
  type = 'button',
  disabled = false,
}: Props) {
  const sizing =
    size === 'md' ? 'py-[14px] px-6 text-[15px]' : 'py-2.5 px-4 text-[13px]';
  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '';
  const classes = `inline-flex items-center justify-center gap-2 rounded-full font-semibold transition ${variantStyles[variant]} ${sizing} ${disabledStyles} ${className}`;

  const content = (
    <>
      {IconLeft && <IconLeft className="w-4 h-4" strokeWidth={2.4} />}
      <span>{children}</span>
      {IconRight && <IconRight className="w-4 h-4" strokeWidth={2.4} />}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} onClick={onClick}>
        {content}
      </Link>
    );
  }
  return (
    <button type={type} className={classes} onClick={onClick} disabled={disabled}>
      {content}
    </button>
  );
}
