
export interface ButtonProps {
  label: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  className?: string;
}

export interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}
