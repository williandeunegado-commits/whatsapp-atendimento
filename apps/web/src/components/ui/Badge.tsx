import React from 'react';

type Variant = 'pending' | 'open' | 'resolved' | 'default';

const variants: Record<Variant, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  open: 'bg-green-100 text-green-800',
  resolved: 'bg-gray-100 text-gray-600',
  default: 'bg-blue-100 text-blue-800',
};

const labels: Record<string, string> = {
  pending: 'Pendente',
  open: 'Aberto',
  resolved: 'Resolvido',
};

interface BadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: BadgeProps) {
  const variant = (status as Variant) in variants ? (status as Variant) : 'default';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

interface ColorBadgeProps {
  color: string;
  label: string;
}

export function ColorBadge({ color, label }: ColorBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}
