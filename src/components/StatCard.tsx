import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

export function StatCard({ title, value, icon, trend, trendUp, className }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-card rounded-xl p-6 border border-slate-700/50 shadow-lg',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted text-sm font-medium mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-text">{value}</h3>
          {trend && (
            <p
              className={cn(
                'text-sm mt-2 font-medium flex items-center gap-1',
                trendUp ? 'text-success' : 'text-danger'
              )}
            >
              {trendUp ? '↑' : '↓'} {trend}
            </p>
          )}
        </div>
        <div className="h-12 w-12 bg-slate-800 rounded-full flex items-center justify-center text-primary">
          {icon}
        </div>
      </div>
    </motion.div>
  );
}
