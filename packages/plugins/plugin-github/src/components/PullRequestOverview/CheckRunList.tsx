//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { Listbox } from '@dxos/react-ui-list';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Status from '@dxos/react-ui/Status';

import { meta } from '#meta';
import { type GitHubOperation } from '#types';

const outcomeIcon: Record<GitHubOperation.CheckOutcome, { icon: string; classNames: string }> = {
  failure: { icon: 'ph--x-circle--fill', classNames: 'text-error-text' },
  pending: { icon: 'ph--circle-notch--regular', classNames: 'text-warning-text animate-spin' },
  success: { icon: 'ph--check-circle--fill', classNames: 'text-success-text' },
  neutral: { icon: 'ph--minus-circle--regular', classNames: 'text-fg-muted' },
  skipped: { icon: 'ph--prohibit--regular', classNames: 'text-fg-muted' },
};

// What needs attention first: a failure is the reason to open the list, a running check the next.
const outcomeOrder: GitHubOperation.CheckOutcome[] = ['failure', 'pending', 'success', 'neutral', 'skipped'];

/**
 * `4m 12s` from start to finish, or to `now` for a run still in progress;
 * undefined for a run that has not started, or has not finished when no `now` is given.
 */
export const formatDuration = (startedAt?: string, completedAt?: string, now?: number): string | undefined => {
  const end = completedAt ? Date.parse(completedAt) : now;
  if (!startedAt || end === undefined) {
    return undefined;
  }
  const seconds = Math.max(0, Math.round((end - Date.parse(startedAt)) / 1000));
  if (Number.isNaN(seconds)) {
    return undefined;
  }
  const minutes = Math.floor(seconds / 60);
  return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
};

/** The current time, re-rendering once a second while `active` so elapsed times stay current. */
const useNow = (active: boolean): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) {
      return;
    }
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(interval);
  }, [active]);
  return now;
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
  const { t } = Hooks.useTranslation(meta.profile.key);
  const sorted = useMemo(() => (runs ? sortCheckRuns(runs) : undefined), [runs]);
  const summary = useCheckSummary(runs);
  const now = useNow(runs?.some((run) => run.outcome === 'pending' && run.startedAt) ?? false);

  if (!sorted || sorted.length === 0) {
    return <Status.Empty>{t(sorted ? 'no-checks.message' : 'checks-loading.message')}</Status.Empty>;
  }

  return (
    <Listbox.Root items={sorted.map((run) => ({ value: `${run.name}-${run.url ?? ''}`, label: run.name }))}>
      <Listbox.Content aria-label={summary} data-testid='pull-request.checks'>
        {sorted.map((run) => {
          const { icon, classNames } = outcomeIcon[run.outcome];
          const duration = formatDuration(run.startedAt, run.completedAt, run.outcome === 'pending' ? now : undefined);
          // GitHub's own word when it says more than the outcome: `timed out` rather than `failed`.
          const detail =
            run.conclusion && run.conclusion !== run.outcome && run.conclusion !== 'failure'
              ? run.conclusion.replace(/_/g, ' ')
              : undefined;
          const outcome =
            run.outcome === 'skipped'
              ? t('check-outcome.skipped.label')
              : run.outcome === 'pending'
                ? [t('check-outcome.pending.label'), duration].filter(Boolean).join(' · ')
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
              <Listbox.ItemIcon icon={icon} classNames={classNames} />
              <Listbox.ItemText>{run.name}</Listbox.ItemText>
              <Listbox.ItemDescription>{[detail, outcome].filter(Boolean).join(' · ')}</Listbox.ItemDescription>
            </Listbox.Item>
          );
        })}
      </Listbox.Content>
    </Listbox.Root>
  );
};

/** The label the checks section carries: the counts once there are runs to count. */
export const useCheckSummary = (runs?: readonly GitHubOperation.CheckRun[]): string => {
  const { t } = Hooks.useTranslation(meta.profile.key);
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
