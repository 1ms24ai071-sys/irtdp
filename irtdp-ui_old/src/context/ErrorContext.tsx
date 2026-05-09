// filepath: src/context/ErrorContext.tsx
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface AppError {
  id: string;
  message: string;
  type: 'error' | 'warning' | 'info';
  retry?: () => void;
}

interface ErrorContextType {
  errors: AppError[];
  addError: (error: Omit<AppError, 'id'>) => void;
  removeError: (id: string) => void;
  clearErrors: () => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [errors, setErrors] = useState<AppError[]>([]);

  const addError = useCallback((error: Omit<AppError, 'id'>) => {
    const id = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setErrors((prev) => [...prev, { ...error, id }]);
    
    // Auto-dismiss after 5 seconds for info type
    if (error.type === 'info') {
      setTimeout(() => {
        setErrors((prev) => prev.filter((e) => e.id !== id));
      }, 5000);
    }
  }, []);

  const removeError = useCallback((id: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  return (
    <ErrorContext.Provider value={{ errors, addError, removeError, clearErrors }}>
      {children}
    </ErrorContext.Provider>
  );
}

export function useError() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within ErrorProvider');
  }
  return context;
}