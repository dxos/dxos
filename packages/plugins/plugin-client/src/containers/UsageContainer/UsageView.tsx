//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { type GetProfileUsageResponse, type MeteringLimit, type MeteringUsageItem } from '@dxos/protocols';
import { IconButton, Message, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';

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

/**
 * Whether a usage row falls under a limit. Subtype segments are matched positionally against
 * `subtypePattern` where `*` matches any segment.
 */
const usageMatchesLimit = (item: MeteringUsageItem, limit: MeteringLimit): boolean => {
  if (item.eventType !== limit.eventType || item.valueKey !== limit.valueKey) {
    return false;
  }
  return limit.subtypePattern.every((pattern, index) => pattern === '*' || pattern === item.subtypePattern[index]);
};

/** Sum every usage item that falls under the limit. */
const sumUsageForLimit = (usage: GetProfileUsageResponse['usage'], limit: MeteringLimit): number =>
  usage.reduce((total, item) => (usageMatchesLimit(item, limit) ? total + item.amount : total), 0);

/** Humanize a camelCase value key, e.g. `outputTokens` → `output tokens`. */
const formatValueKey = (valueKey: string): string =>
  valueKey
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .toLowerCase();

/**
 * Human label for a limit: a scope followed by the value key, e.g.
 * `{ eventType: 'ai', valueKey: 'outputTokens', subtypePattern: ['*'] }` → `All models · output tokens`,
 * `{ eventType: 'ai', valueKey: 'inputTokens', subtypePattern: ['claude-opus-4'] }` → `claude-opus-4 · input tokens`.
 */
const formatLimitLabel = (limit: MeteringLimit, t: TFunction): string => {
  const metric = formatValueKey(limit.valueKey);
  const subtype = limit.subtypePattern.filter((segment) => segment && segment !== '*').join('/');
  if (limit.eventType === 'ai') {
    return `${subtype || t('usage-all-models.label')} · ${metric}`;
  }
  return `${subtype ? `${limit.eventType}/${subtype}` : limit.eventType} · ${metric}`;
};

const formatAmount = (amount: number): string => amount.toLocaleString();

const SECONDS_PER_HOUR = 60 * 60;

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

/**
 * A single usage row: label + caption on the left, a thin meter, and a value on the right.
 * Omitting `percent` (an unlimited limit) renders no meter.
 */
const UsageRow = ({
  label,
  caption,
  percent,
  value,
}: {
  label: string;
  caption?: string;
  percent?: number;
  value: string;
}) => (
  <div className='flex items-center gap-trim-lg py-trim-sm'>
    <div className='flex flex-col min-w-0 w-1/3 shrink-0'>
      <span className='truncate text-base-fg'>{label}</span>
      {caption && <span className='text-sm text-description'>{caption}</span>}
    </div>
    {percent === undefined ? (
      <div className='flex-1' />
    ) : (
      <div
        role='progressbar'
        aria-label={label}
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
    )}
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

/**
 * Presentational view of profile usage: renders loading/error/unavailable/empty states, or one row
 * per limit with a usage meter, plus a collapsible raw-response viewer. Pure — all data via props.
 */
export const UsageView = ({ state, data, lastUpdated, onRefresh }: UsageViewProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [rawExpanded, setRawExpanded] = useState(false);

  // One display row per limit, shorter windows first. A `null` amount means unlimited (rendered without a meter).
  const limitRows = useMemo(() => {
    if (!data) {
      return [];
    }
    return data.limits
      .map((limit) => {
        const used = sumUsageForLimit(data.usage, limit);
        const label = formatLimitLabel(limit, t);
        const windowHours = limit.windowDuration / SECONDS_PER_HOUR;
        const window = formatWindow(windowHours, t);
        const key = `${limit.eventType}/${limit.subtypePattern.join(',')}/${limit.valueKey}/${limit.windowDuration}/${limit.limit ?? 'unlimited'}`;
        if (limit.limit === null) {
          return {
            key,
            label,
            caption: t('usage-unlimited.description', { used: formatAmount(used), window }),
            percent: undefined,
            value: t('usage-unlimited.label'),
            windowHours,
          };
        }
        const percent = limit.limit > 0 ? Math.min(100, Math.round((used / limit.limit) * 100)) : used > 0 ? 100 : 0;
        return {
          key,
          label,
          caption: t('usage-limit.description', { used: formatAmount(used), limit: formatAmount(limit.limit), window }),
          percent,
          value: t('usage-percent-used.label', { percent }),
          windowHours,
        };
      })
      .sort((a, b) => a.windowHours - b.windowHours);
  }, [data, t]);

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
            {limitRows.map((row) => (
              <UsageRow key={row.key} label={row.label} caption={row.caption} percent={row.percent} value={row.value} />
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
        {state === 'ready' && data && (
          <div className='flex flex-col pt-trim-md'>
            <IconButton
              variant='ghost'
              icon='ph--caret-right--regular'
              iconClassNames={rawExpanded ? 'transition-transform rotate-90' : 'transition-transform'}
              label={t('usage-raw-json.label')}
              onClick={() => setRawExpanded((value) => !value)}
              classNames='self-start'
            />
            {rawExpanded && <JsonHighlighter data={data} classNames='mt-trim-sm text-xs overflow-auto' />}
          </div>
        )}
      </Settings.Section>
    </Settings.Viewport>
  );
};
