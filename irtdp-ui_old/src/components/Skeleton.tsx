// filepath: src/components/Skeleton.tsx
import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className = '', variant = 'rectangular', width, height }: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-200';
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style: React.CSSProperties = {
    width: width || '100%',
    height: height || (variant === 'text' ? '1em' : '100%'),
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
}

// Skeleton for incident card
export function IncidentCardSkeleton() {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-start mb-3">
        <Skeleton width={80} height={24} variant="text" />
        <Skeleton width={60} height={24} variant="text" />
      </div>
      <Skeleton width="70%" height={20} className="mb-2" />
      <Skeleton width="100%" height={16} className="mb-1" />
      <Skeleton width="90%" height={16} className="mb-4" />
      <div className="flex justify-between pt-3 border-t border-gray-100">
        <Skeleton width={80} height={14} />
        <Skeleton width={100} height={14} />
      </div>
    </div>
  );
}

// Skeleton for dashboard stats
export function StatsCardSkeleton() {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <Skeleton width={100} height={14} className="mb-2" />
      <Skeleton width={60} height={32} />
    </div>
  );
}

// Skeleton for form fields
export function FormFieldSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton width={80} height={14} />
      <Skeleton width="100%" height={44} />
    </div>
  );
}

export default Skeleton;