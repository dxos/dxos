//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Icon, useTranslation } from '@dxos/react-ui';
import { Empty, Listbox } from '@dxos/react-ui-list';

import { meta } from '#meta';
import { type GitHubOperation } from '#types';

const outcomeIcon: Record<GitHubOperation.CheckOutcome, { icon: string; classNames: string }> = {
  failure: { icon: 'ph--x-circle--fill', classNames: 'text-error-text' },
  pending: { icon: 'ph--circle-notch--regular', classNames: 'text-warning-text animate-spin' },
  success: { icon: 'ph--check-circle--fill', classNames: 'text-success-text' },
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

/** Every check on the head commit: its outcome, how long it took, and its logs a click away. */
export const CheckRunList = ({ runs }: CheckRunListProps) => {
  const { t } = useTranslation(meta.profile.key);
  const sorted = useMemo(() => (runs ? sortCheckRuns(runs) : undefined), [runs]);
  const summary = useCheckSummary(runs);

  if (!sorted || sorted.length === 0) {
    return <Empty label={t(sorted ? 'no-checks.message' : 'checks-loading.message')} />;
  }

  return (
    <Listbox.Root>
      <Listbox.Content aria-label={summary} data-testid='pull-request.checks'>
        {sorted.map((run) => {
          const { icon, classNames } = outcomeIcon[run.outcome];
          const duration = formatDuration(run.startedAt, run.completedAt);
          // GitHub's own word when it says more than the outcome: `timed out` rather than `failed`.
          const detail =
            run.conclusion && run.conclusion !== run.outcome && run.conclusion !== 'failure'
              ? run.conclusion.replace(/_/g, ' ')
              : undefined;
          const outcome =
            run.outcome === 'skipped'
              ? t('check-outcome.skipped.label')
              : (duration ?? t(`check-outcome.${run.outcome}.label`));
          const url = run.url;
          return (
            <Listbox.Item
              key={`${run.name}-${url ?? ''}`}
              id={`${run.name}-${url ?? ''}`}
              data-outcome={run.outcome}
              data-testid='pull-request.check'
              onClick={url ? () => window.open(url, '_blank', 'noopener,noreferrer') : undefined}
            >
              <Listbox.ItemContent
                icon={<Icon icon={icon} size={5} classNames={classNames} />}
                title={run.name}
                description={[detail, outcome].filter(Boolean).join(' · ')}
              />
            </Listbox.Item>
          );
        })}
      </Listbox.Content>
    </Listbox.Root>
  );
};

/** The label the checks section carries: the counts once there are runs to count. */
export const useCheckSummary = (runs?: readonly GitHubOperation.CheckRun[]): string => {
  const { t } = useTranslation(meta.profile.key);
  return useMemo(() => {
    if (!runs || runs.length === 0) {
      return t('checks.label');
    }
    const counts: Record<GitHubOperation.CheckOutcome, number> = {
      success: 0,
      failure: 0,
      pending: 0,
      skipped: 0,
      neutral: 0,
    };
    for (const run of runs) {
      counts[run.outcome]++;
    }
    return t('checks-summary.label', {
      passed: counts.success + counts.neutral,
      failed: counts.failure,
      pending: counts.pending,
      skipped: counts.skipped,
    });
  }, [runs, t]);
};
