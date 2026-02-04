import { CheckCircle, Circle, Clock, Warning, XCircle } from '@phosphor-icons/react';
import type { CheckRun } from '../types';

interface ChecksStatusProps {
  checks: CheckRun[];
}

export const ChecksStatus = ({ checks }: ChecksStatusProps) => {
  if (checks.length === 0) {
    return <span className="text-gray-500 text-sm">No checks</span>;
  }

  const summary = {
    success: 0,
    failure: 0,
    pending: 0,
    neutral: 0,
  };

  for (const check of checks) {
    if (check.status !== 'completed') {
      summary.pending++;
    } else if (check.conclusion === 'success') {
      summary.success++;
    } else if (check.conclusion === 'failure') {
      summary.failure++;
    } else {
      summary.neutral++;
    }
  }

  const getIcon = () => {
    if (summary.failure > 0) {
      return <XCircle className="w-5 h-5 text-red-500" weight="fill" />;
    }
    if (summary.pending > 0) {
      return <Clock className="w-5 h-5 text-yellow-500" weight="fill" />;
    }
    if (summary.success === checks.length) {
      return <CheckCircle className="w-5 h-5 text-green-500" weight="fill" />;
    }
    return <Circle className="w-5 h-5 text-gray-500" weight="fill" />;
  };

  const getStatusText = () => {
    if (summary.failure > 0) {
      return `${summary.failure} failed`;
    }
    if (summary.pending > 0) {
      return `${summary.pending} pending`;
    }
    return `${summary.success} passed`;
  };

  return (
    <div className="flex items-center gap-2">
      {getIcon()}
      <span className="text-sm text-gray-300">{getStatusText()}</span>
      {summary.failure > 0 && (
        <div className="group relative">
          <Warning className="w-4 h-4 text-red-400 cursor-help" />
          <div className="absolute z-10 hidden group-hover:block bg-gray-800 border border-gray-700 rounded-md p-2 min-w-[200px] bottom-full left-0 mb-1">
            <p className="text-xs font-semibold text-red-400 mb-1">Failed checks:</p>
            <ul className="text-xs text-gray-300 space-y-0.5">
              {checks
                .filter((c) => c.conclusion === 'failure')
                .slice(0, 5)
                .map((c) => (
                  <li key={c.id} className="truncate">
                    {c.name}
                  </li>
                ))}
              {checks.filter((c) => c.conclusion === 'failure').length > 5 && (
                <li className="text-gray-500">
                  +{checks.filter((c) => c.conclusion === 'failure').length - 5} more
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
