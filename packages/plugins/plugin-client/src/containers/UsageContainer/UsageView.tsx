//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { type GetProfileUsageResponse, type MeteringLimit } from '@dxos/protocols';
import { IconButton, Message, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';

import { meta } from '#meta';

export type UsageViewState = 'loading' | 'ready' | 'error' | 'unavailable';

export type UsageViewProps = {
  /** Current fetch state; drives which content is shown. */
  state: UsageViewState;
  /** Profile usage payload; required when `state` is `'ready'`. */
  data?: GetProfileUsageResponse;
  /** Epoch milliseconds of the last successful fetch. */
  lastUpdated?: number;
  /** Invoked when the user requests a refresh. */
  onRefresh?: () => void;
};

type TFunction = (key: string, options?: Record<string, unknown>) => string;

/** Sum every usage item whose category falls under the limit's prefix. */
const sumUsageForLimit = (usage: GetProfileUsageResponse['usage'], limit: MeteringLimit): number =>
  usage.reduce((total, item) => (item.category.startsWith(limit.categoryPrefix) ? total + item.amount : total), 0);

/**
 * Turn a metering category/prefix into a human label, e.g.
 * `ai` → `All models`, `ai/claude-opus-4` → `claude-opus-4`,
 * `ai/claude-opus-4/inputTokens` → `claude-opus-4 · input tokens`.
 */
const formatCategoryLabel = (categoryPrefix: string): string => {
  const segments = categoryPrefix.split('/');
  if (segments[0] === 'ai') {
    if (segments.length >= 3) {
      const metric = segments.at(-1) ?? categoryPrefix;
      const model = segments.slice(1, -1).join('/');
      return `${model} · ${metric.replace(/([A-Z])/g, ' $1').trim().toLowerCase()}`;
    }
    if (segments.length === 2) {
      return segments[1];
    }
    return 'All models';
  }
  return categoryPrefix;
};

const formatAmount = (amount: number): string => amount.toLocaleString();

/** Render `windowHours` as a localized "N months / days / hours" string. */
const formatWindow = (windowHours: number, t: TFunction): string => {
  if (windowHours % (24 * 30) === 0) {
    return t('usage-window-months.label', { count: windowHours / (24 * 30) });
  }
  if (windowHours % 24 === 0) {
    return t('usage-window-days.label', { count: windowHours / 24 });
  }
  return t('usage-window-hours.label', { count: windowHours });
};

/** A single usage row: label + caption on the left, a thin meter, and a value on the right. */
const UsageRow = ({
  label,
  caption,
  percent,
  value,
}: {
  label: string;
  caption?: string;
  percent: number;
  value: string;
}) => (
  <div className='flex items-center gap-trim-lg py-trim-sm'>
    <div className='flex flex-col min-w-0 w-1/3 shrink-0'>
      <span className='truncate text-base-fg'>{label}</span>
      {caption && <span className='text-sm text-description'>{caption}</span>}
    </div>
    <div
      role='progressbar'
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      className='h-1.5 flex-1 rounded-full bg-separator overflow-hidden'
    >
      <div
        className='h-full rounded-full bg-primary-500 transition-[width] duration-500'
        style={{ width: `${percent}%` }}
      />
    </div>
    <span className='shrink-0 w-24 text-end text-sm text-description tabular-nums'>{value}</span>
  </div>
);

/** Placeholder rows shown while the first fetch is in flight. */
const UsageSkeleton = () => (
  <div className='flex flex-col'>
    {Array.from({ length: 3 }).map((_, index) => (
      <div key={index} className='flex items-center gap-trim-lg py-trim-sm'>
        <div className='flex flex-col gap-1 w-1/3 shrink-0'>
          <div className='h-4 w-24 rounded bg-separator animate-pulse' />
          <div className='h-3 w-32 rounded bg-separator animate-pulse' />
        </div>
        <div className='h-1.5 flex-1 rounded-full bg-separator animate-pulse' />
        <div className='h-3 w-12 shrink-0 rounded bg-separator animate-pulse' />
      </div>
    ))}
  </div>
);

export const UsageView = ({ state, data, lastUpdated, onRefresh }: UsageViewProps) => {
  const { t } = useTranslation(meta.id);

  // Limits, each paired with summed usage and a clamped percentage. Shorter windows first.
  const limitRows = useMemo(() => {
    if (!data) {
      return [];
    }
    return data.limits
      .map((limit) => {
        const used = sumUsageForLimit(data.usage, limit);
        const percent = limit.amount > 0 ? Math.min(100, Math.round((used / limit.amount) * 100)) : 0;
        return { limit, used, percent };
      })
      .sort((a, b) => a.limit.windowHours - b.limit.windowHours);
  }, [data]);

  return (
    <Settings.Viewport>
      <Settings.Section title={t('usage-section.title')} description={t('usage-section.description')}>
        {state === 'unavailable' ? (
          <Message.Root valence='warning'>
            <Message.Title icon='ph--cloud-slash--duotone'>{t('usage-unavailable.title')}</Message.Title>
            <Message.Content>{t('usage-unavailable.description')}</Message.Content>
          </Message.Root>
        ) : state === 'loading' ? (
          <UsageSkeleton />
        ) : state === 'error' ? (
          <Message.Root valence='error'>
            <Message.Title icon='ph--cloud-x--duotone'>{t('usage-offline.title')}</Message.Title>
            <Message.Content>{t('usage-offline.description')}</Message.Content>
          </Message.Root>
        ) : limitRows.length === 0 ? (
          <Message.Root valence='neutral'>
            <Message.Title icon='ph--chart-bar--duotone'>{t('usage-empty.title')}</Message.Title>
            <Message.Content>{t('usage-empty.description')}</Message.Content>
          </Message.Root>
        ) : (
          <div className='flex flex-col'>
            {limitRows.map(({ limit, used, percent }) => (
              <UsageRow
                key={limit.categoryPrefix}
                label={formatCategoryLabel(limit.categoryPrefix)}
                caption={t('usage-limit.description', {
                  used: formatAmount(used),
                  limit: formatAmount(limit.amount),
                  window: formatWindow(limit.windowHours, t),
                })}
                percent={percent}
                value={t('usage-percent-used.label', { percent })}
              />
            ))}

            <div className='flex items-center gap-1 pt-trim-md text-sm text-description'>
              {lastUpdated !== undefined && (
                <span>{t('usage-last-updated.label', { time: new Date(lastUpdated).toLocaleTimeString() })}</span>
              )}
              {onRefresh && (
                <IconButton
                  iconOnly
                  variant='ghost'
                  icon='ph--arrow-clockwise--regular'
                  label={t('usage-refresh.label')}
                  onClick={onRefresh}
                />
              )}
            </div>
          </div>
        )}
      </Settings.Section>
    </Settings.Viewport>
  );
};
