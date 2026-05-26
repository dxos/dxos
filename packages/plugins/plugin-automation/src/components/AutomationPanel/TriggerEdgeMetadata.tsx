//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Trigger } from '@dxos/compute';
import { type TriggersDispatcherStatus } from '@dxos/edge-client';
import { useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import { type EdgeTriggersDispatcherStatusState } from '../../hooks';

const formatTimestamp = (timestamp?: number): string | undefined =>
  timestamp != null ? new Date(timestamp).toLocaleString() : undefined;

const formatRemaining = (remainingMs?: number): string | undefined => {
  if (remainingMs == null) {
    return undefined;
  }
  const totalSeconds = Math.max(0, Math.round(remainingMs / 1000));
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
};

export type TriggerDispatcherSummaryProps = {
  status: TriggersDispatcherStatus | undefined;
  error: boolean;
  loading: boolean;
  /** Timer triggers shown in the list (used for registered count). */
  timerTriggers: Trigger.Trigger[];
};

export const TriggerDispatcherSummary = ({ status, error, loading, timerTriggers }: TriggerDispatcherSummaryProps) => {
  const { t } = useTranslation(meta.id);

  if (loading && !status) {
    return <div className='text-xs text-description px-2 pb-2'>{t('edge.trigger.status.loading.message')}</div>;
  }

  if (error && !status) {
    return <div className='text-xs text-error-text px-2 pb-2'>{t('edge.trigger.status.unavailable.message')}</div>;
  }

  if (!status) {
    return null;
  }

  const enabledTimerCount = timerTriggers.filter((trigger) => trigger.enabled).length;
  const registeredEnabledCount = timerTriggers.filter(
    (trigger) => trigger.enabled && status.registeredTriggers.includes(trigger.id),
  ).length;

  const lines = [
    t('edge.trigger.status.dispatcher.label', {
      state: status.isActive ? t('edge.trigger.status.active.label') : t('edge.trigger.status.inactive.label'),
    }),
    timerTriggers.length > 0 &&
      t('edge.trigger.status.registered.count.label', {
        registered: registeredEnabledCount,
        total: enabledTimerCount,
      }),
    status.nextCronTaskRunTimestamp != null &&
      t('edge.trigger.status.next.cron.label', { time: formatTimestamp(status.nextCronTaskRunTimestamp) }),
    status.nextAlarmTimestamp != null &&
      t('edge.trigger.status.next.alarm.label', { time: formatTimestamp(status.nextAlarmTimestamp) }),
    status.remainingMs != null &&
      t('edge.trigger.status.inactivity.label', { remaining: formatRemaining(status.remainingMs) }),
  ].filter((line): line is string => Boolean(line));

  if (lines.length === 0) {
    return null;
  }

  return (
    <div className='flex flex-col gap-0.5 text-xs text-description px-2 pb-2'>
      {lines.map((line) => (
        <div key={line}>{line}</div>
      ))}
    </div>
  );
};

export type TriggerEdgeMetadataProps = {
  trigger: Trigger.Trigger;
  edgeStatus: Pick<EdgeTriggersDispatcherStatusState, 'status' | 'loading' | 'error'>;
};

export const TriggerEdgeMetadata = ({ trigger, edgeStatus }: TriggerEdgeMetadataProps) => {
  const { t } = useTranslation(meta.id);
  const { status, loading, error } = edgeStatus;

  const registration = useMemo(() => {
    if (trigger.spec?.kind !== 'timer') {
      return { kind: 'na' as const };
    }
    if (!status) {
      return { kind: 'unknown' as const };
    }
    return {
      kind: 'cron' as const,
      registered: status.registeredTriggers.includes(trigger.id),
    };
  }, [status, trigger.id, trigger.spec?.kind]);

  if (loading && !status) {
    return <div className='text-xs text-description ml-4 truncate'>{t('edge.trigger.status.loading.message')}</div>;
  }

  if (error && !status) {
    return null;
  }

  if (!status) {
    return null;
  }

  if (registration.kind === 'na') {
    return <div className='text-xs text-description ml-4 truncate'>{t('edge.trigger.status.cron.na.label')}</div>;
  }

  const enabled = trigger.enabled ?? false;
  const registered = registration.kind === 'cron' && registration.registered;

  const label = registered ? t('edge.trigger.status.registered.label') : t('edge.trigger.status.not.registered.label');

  const classNames = mx(
    'text-xs ml-4 truncate',
    registered ? 'text-success-text' : enabled ? 'text-warning-text' : 'text-description',
  );

  const detail = registration.kind === 'cron' && !enabled ? t('edge.trigger.status.disabled.detail.label') : undefined;

  return (
    <div className='flex flex-col gap-0.5 min-w-0'>
      <div className={classNames}>
        {label}
        {detail && <span className='text-description'> · {detail}</span>}
      </div>
    </div>
  );
};
