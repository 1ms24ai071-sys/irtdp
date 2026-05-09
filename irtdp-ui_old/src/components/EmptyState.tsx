// filepath: src/components/EmptyState.tsx
import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="text-6xl mb-4 animate-bounce-slow">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-700 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-500 max-w-md mb-6">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium
                     hover:bg-indigo-700 active:scale-95 transition-all duration-200
                     shadow-md hover:shadow-lg"
        >
          {action.label}
        </button>
      )}
      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// Pre-defined empty states
export function NoIncidentsEmpty({ onCreateNew }: { onCreateNew?: () => void }) {
  return (
    <EmptyState
      icon="🚨"
      title="No incidents reported yet"
      description="Be the first to report an incident to help keep your community safe."
      action={onCreateNew ? { label: '+ Report Incident', onClick: onCreateNew } : undefined}
    />
  );
}

export function NoResultsEmpty({ onClear }: { onClear?: () => void }) {
  return (
    <EmptyState
      icon="🔍"
      title="No results found"
      description="Try adjusting your search or filter criteria."
      action={onClear ? { label: 'Clear filters', onClick: onClear } : undefined}
    />
  );
}

export default EmptyState;