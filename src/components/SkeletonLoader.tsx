/**
 * SkeletonLoader - Notion-style skeleton loading UI
 * Replaces the simple spinner with content-aware skeleton placeholders
 */

import React from 'react';
import { cn } from '../lib/utils';

const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse rounded-md bg-secondary", className)} />
);

export const SkeletonLoader = () => (
  <div className="animate-fade-in space-y-6 max-w-[1200px] mx-auto px-4 py-8">
    {/* Metrics Row */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="metric-card">
          <Skeleton className="h-3 w-16 mb-2" />
          <Skeleton className="h-8 w-12" />
        </div>
      ))}
    </div>

    {/* Two Column Layout */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="notion-card p-5 space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-6 w-full rounded-full" />
        <div className="flex gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-1 text-center">
              <Skeleton className="h-6 w-8 mx-auto mb-1" />
              <Skeleton className="h-2 w-12 mx-auto" />
            </div>
          ))}
        </div>
      </div>
      <div className="notion-card p-5 space-y-3">
        <Skeleton className="h-4 w-20" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-8" />
          </div>
        ))}
      </div>
    </div>

    {/* Cards Grid */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="notion-card p-4 space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="h-3 w-full" />
          <div className="flex gap-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/** Small skeleton for inline loading */
export const InlineSkeleton = ({ width = 80, height = 16 }: { width?: number; height?: number }) => (
  <Skeleton className={`inline-block`} style={{ width, height }} />
);
