import { Children, type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

/**
 * Reusable button component with variant and size options.
 * @param {ButtonProps} props - Button properties.
 * @param {string} props.variant - Button style variant (primary, secondary, ghost, outline).
 * @param {string} props.size - Button size (sm, md, lg).
 * @param {boolean} props.fullWidth - Whether button should take full width.
 * @param {string} props.className - Additional CSS classes.
 * @param {React.ReactNode} props.children - Button content.
 * @returns {JSX.Element} Styled button element.
 */
const Button = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  ...props
}: ButtonProps) => {
  const baseClass = 'btn';
  const variantClass = `btn--${variant}`;
  const sizeClass = `btn--${size}`;
  const fullWidthClass = fullWidth ? 'btn--full' : '';

  const combinedClasses = [
    baseClass,
    variantClass,
    sizeClass,
    fullWidthClass,
    className
  ].filter(Boolean).join(' ');

  return (
    <button className={combinedClasses} {...props}>
      {children}
    </button>
  );
};

export default Button;
