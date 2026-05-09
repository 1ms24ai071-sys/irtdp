// filepath: src/components/ErrorBanner.tsx
import React from 'react';
import { useError, AppError } from '../context/ErrorContext';

function ErrorItem({ error, onDismiss }: { error: AppError; onDismiss: () => void }) {
  const icons = {
    error: '⚠️',
    warning: '🔔',
    info: 'ℹ️',
  };

  const colors = {
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-lg border ${colors[error.type]} shadow-sm animate-slide-in`}>
      <div className="flex items-center gap-3">
        <span className="text-xl">{icons[error.type]}</span>
        <span className="font-medium">{error.message}</span>
        {error.retry && (
          <button
            onClick={error.retry}
            className="ml-2 px-3 py-1 text-sm font-semibold rounded-md bg-white border border-current opacity-80 hover:opacity-100 transition-opacity"
          >
            Retry
          </button>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="ml-4 text-lg opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

export function ErrorBanner() {
  const { errors, removeError } = useError();

  if (errors.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {errors.map((error) => (
        <ErrorItem key={error.id} error={error} onDismiss={() => removeError(error.id)} />
      ))}
    </div>
  );
}

export default ErrorBanner;