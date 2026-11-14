import React from 'react';
import { WithdrawalRequest } from '../types';

interface AnalyticsChartsProps {
  withdrawals: WithdrawalRequest[];
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ withdrawals }) => {
  // Compute status counts
  const total = withdrawals.length || 1;
  const completed = withdrawals.filter((w) => w.status === 'completed').length;
  const processing = withdrawals.filter((w) => w.status === 'processing').length;
  const approved = withdrawals.filter((w) => w.status === 'approved').length;
  const pending = withdrawals.filter((w) => w.status === 'pending').length;
  const rejected = withdrawals.filter((w) => w.status === 'rejected' || w.status === 'failed').length;

  const completedPct = Math.round((completed / total) * 100);
  const inFlightPct = Math.round(((processing + approved + pending) / total) * 100);
  const rejectedPct = Math.max(0, 100 - completedPct - inFlightPct);

  // Group volume by mock daily buckets
  const days = ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Today'];
  const dailyVolumes = [12000, 28000, 19000, 45000, 32000, 68000, 84500];
  const maxVol = Math.max(...dailyVolumes, 90000);

  // SVG dimensions
  const svgWidth = 500;
  const svgHeight = 160;
  const paddingX = 40;
  const paddingY = 25;

  const points = dailyVolumes.map((vol, index) => {
    const x = paddingX + (index / (dailyVolumes.length - 1)) * (svgWidth - paddingX * 2);
    const y = svgHeight - paddingY - (vol / maxVol) * (svgHeight - paddingY * 2);
    return { x, y, vol, day: days[index] };
  });

  const pathD = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${svgHeight - paddingY} L ${points[0].x} ${svgHeight - paddingY} Z`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Volume Trend Area Chart */}
      <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Payout Volume Velocity (Last 7 Days)
            </h3>
            <p className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
              ₹2,88,500.00{' '}
              <span className="text-xs font-sans font-medium text-emerald-600 dark:text-emerald-400">
                +14.8% vs last week
              </span>
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400">100% Verified Rails</span>
        </div>

        <div className="w-full overflow-hidden">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-36">
            <defs>
              <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[0.25, 0.5, 0.75].map((pct, i) => {
              const y = svgHeight - paddingY - pct * (svgHeight - paddingY * 2);
              return (
                <line
                  key={i}
                  x1={paddingX}
                  y1={y}
                  x2={svgWidth - paddingX}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-100 dark:text-slate-800"
                  strokeDasharray="4 4"
                />
              );
            })}

            {/* Filled Area */}
            <path d={areaD} fill="url(#volumeGrad)" />

            {/* Line stroke */}
            <path
              d={pathD}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Points & Labels */}
            {points.map((pt, i) => (
              <g key={i}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="3.5"
                  className="fill-blue-600 stroke-white dark:stroke-slate-900"
                  strokeWidth="2"
                />
                <text
                  x={pt.x}
                  y={svgHeight - 8}
                  textAnchor="middle"
                  className="text-[10px] fill-slate-400 font-mono"
                >
                  {pt.day}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Payout Status Ratio Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Lifecycle Clearance Rate
          </h3>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {completedPct}%
            <span className="text-xs font-sans font-normal text-slate-400 ml-2">
              Settlement Rate
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {completed} of {total} total transactions settled
          </p>
        </div>

        {/* Multi-segment ratio progress bar */}
        <div className="my-4">
          <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${completedPct}%` }}
              className="bg-emerald-500 transition-all duration-500"
              title={`Settled: ${completedPct}%`}
            />
            <div
              style={{ width: `${inFlightPct}%` }}
              className="bg-blue-500 transition-all duration-500"
              title={`In-Flight: ${inFlightPct}%`}
            />
            <div
              style={{ width: `${rejectedPct}%` }}
              className="bg-rose-500 transition-all duration-500"
              title={`Rejected/Refunded: ${rejectedPct}%`}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-slate-600 dark:text-slate-300">
                Paid ({completed})
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-slate-600 dark:text-slate-300">
                In-Flight ({processing + approved + pending})
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-slate-600 dark:text-slate-300">
                Refunded ({rejected})
              </span>
            </div>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Active Banking Rails</span>
          <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
            NPCI UPI · RBI IMPS
          </span>
        </div>
      </div>
    </div>
  );
};
