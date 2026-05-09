// filepath: src/components/LoadingBar.tsx
import React from 'react';
import { useLoading } from '../context/LoadingContext';

export function LoadingBar() {
  const { isLoading } = useLoading();

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 h-1 bg-transparent transition-all duration-300 ${
        isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 animate-pulse-fast shadow-lg">
        <div className="loading-shimmer" />
      </div>
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .loading-shimmer {
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 50%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.4),
            transparent
          );
          animation: shimmer 1s infinite ease-in-out;
        }
        .animate-pulse-fast {
          animation: pulse 1.5s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}

export default LoadingBar;