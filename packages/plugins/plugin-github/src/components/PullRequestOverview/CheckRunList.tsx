//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Icon, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { type GitHubOperation } from '#types';

const outcomeIcon: Record<GitHubOperation.CheckOutcome, { icon: string; classNames: string }> = {
  failure: { icon: 'ph--x-circle--fill', classNames: 'text-red-500' },
  pending: { icon: 'ph--circle-notch--regular', classNames: 'text-amber-500 animate-spin' },
  success: { icon: 'ph--check-circle--fill', classNames: 'text-green-500' },
  neutral: { icon: 'ph--minus-circle--regular', classNames: 'text-description' },
  skipped: { icon: 'ph--prohibit--regular', classNames: 'text-description' },
};

// What needs attention first: a failure is the reason to open the list, a running check the next.
const outcomeOrder: GitHubOperation.CheckOutcome[] = ['failure', 'pending', 'success', 'neutral', 'skipped'];

/** `4m 12s`, or undefined for a run that has not both started and finished. */
export const formatDuration = (startedAt?: string, completedAt?: string): string | undefined => {
  if (!startedAt || !completedAt) {
    return undefined;
  }
  const seconds = Math.max(0, Math.round((Date.parse(completedAt) - Date.parse(startedAt)) / 1000));
  if (Number.isNaN(seconds)) {
    return undefined;
  }
  const minutes = Math.floor(seconds / 60);
  return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
};

/** Sorts runs by what needs attention, then by name so shards read in order. */
export const sortCheckRuns = (runs: readonly GitHubOperation.CheckRun[]): GitHubOperation.CheckRun[] =>
  [...runs].sort(
    (a, b) =>
      outcomeOrder.indexOf(a.outcome) - outcomeOrder.indexOf(b.outcome) ||
      a.name.localeCompare(b.name, undefined, { numeric: true }),
  );

export type CheckRunListProps = {
  /** Undefined while the status is loading. */
  runs?: readonly GitHubOperation.CheckRun[];
};

/** Every check on the head commit: its outcome, how long it took, and a link to its logs. */
export const CheckRunList = ({ runs }: CheckRunListProps) => {
  const { t } = useTranslation(meta.profile.key);
  const sorted = useMemo(() => (runs ? sortCheckRuns(runs) : undefined), [runs]);
  const counts = useMemo(() => {
    const counts: Record<GitHubOperation.CheckOutcome, number> = {
      success: 0,
      failure: 0,
      pending: 0,
      skipped: 0,
      neutral: 0,
    };
    for (const run of runs ?? []) {
      counts[run.outcome]++;
    }
    return counts;
  }, [runs]);

  if (!sorted) {
    return <p className='text-description text-sm'>{t('checks-loading.message')}</p>;
  }
  if (sorted.length === 0) {
    return <p className='text-description text-sm'>{t('no-checks.message')}</p>;
  }

  return (
    <div className='flex flex-col gap-1'>
      <p className='text-description text-sm'>
        {t('checks-summary.label', {
          passed: counts.success + counts.neutral,
          failed: counts.failure,
          pending: counts.pending,
          skipped: counts.skipped,
        })}
      </p>
      <ul className='flex flex-col border border-separator rounded-sm divide-y divide-separator'>
        {sorted.map((run) => {
          const { icon, classNames } = outcomeIcon[run.outcome];
          const duration = formatDuration(run.startedAt, run.completedAt);
          // GitHub's own word when it says more than the outcome: `timed out` rather than `failed`.
          const detail =
            run.conclusion && run.conclusion !== run.outcome && run.conclusion !== 'failure'
              ? run.conclusion.replace(/_/g, ' ')
              : undefined;
          const content = (
            <>
              <Icon icon={icon} size={4} classNames={['shrink-0', classNames]} />
              <span className='grow truncate'>{run.name}</span>
              {detail && <span className='text-description whitespace-nowrap'>{detail}</span>}
              <span className='text-description whitespace-nowrap tabular-nums'>
                {run.outcome === 'skipped'
                  ? t('check-outcome.skipped.label')
                  : (duration ?? t(`check-outcome.${run.outcome}.label`))}
              </span>
              {run.url && <Icon icon='ph--arrow-square-out--regular' size={3} classNames='shrink-0 text-description' />}
            </>
          );
          return (
            <li key={`${run.name}-${run.url ?? ''}`} data-outcome={run.outcome} data-testid='pull-request.check'>
              {run.url ? (
                <a
                  href={run.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='flex items-center gap-2 px-2 py-1 text-sm hover:bg-hover-surface'
                >
                  {content}
                </a>
              ) : (
                <div className='flex items-center gap-2 px-2 py-1 text-sm'>{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
