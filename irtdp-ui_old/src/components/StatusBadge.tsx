// filepath: src/components/StatusBadge.tsx
import React from 'react';

type IncidentStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'REPORTED' | 'reported' | 'resolved';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; bgClass: string; textClass: string }> = {
  NEW: { label: 'New', bgClass: 'bg-blue-100', textClass: 'text-blue-800' },
  IN_PROGRESS: { label: 'In Progress', bgClass: 'bg-amber-100', textClass: 'text-amber-800' },
  RESOLVED: { label: 'Resolved', bgClass: 'bg-green-100', textClass: 'text-green-800' },
  REPORTED: { label: 'Reported', bgClass: 'bg-blue-100', textClass: 'text-blue-800' },
  reported: { label: 'Reported', bgClass: 'bg-blue-100', textClass: 'text-blue-800' },
  resolved: { label: 'Resolved', bgClass: 'bg-green-100', textClass: 'text-green-800' },
  in_progress: { label: 'In Progress', bgClass: 'bg-amber-100', textClass: 'text-amber-800' },
  inProgress: { label: 'In Progress', bgClass: 'bg-amber-100', textClass: 'text-amber-800' },
};

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, bgClass: 'bg-gray-100', textClass: 'text-gray-800' };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${config.bgClass} ${config.textClass} ${className}`}
    >
      {config.label}
    </span>
  );
}

export default StatusBadge;