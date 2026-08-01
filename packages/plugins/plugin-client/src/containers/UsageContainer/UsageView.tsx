//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo, useState } from 'react';

import { type GetProfileUsageResponse, type MeteringLimit, type MeteringUsageItem } from '@dxos/protocols';
import { Message, Status, useTranslation } from '@dxos/react-ui';
import { Form, type FormFieldProvider } from '@dxos/react-ui-form';

import { meta } from '#meta';

export type UsageViewState = 'loading' | 'ready' | 'error' | 'unavailable';

type UsageViewCommonProps = {
  /** Epoch milliseconds of the last successful fetch. */
  lastUpdated?: number;
  /** Invoked when the user requests a refresh. */
  onRefresh?: () => void;
};

/**
 * Discriminated on `state`: the payload is required (and only present) when `state` is `'ready'`, so a
 * missing payload can't be silently rendered as an empty plan.
 */
export type UsageViewProps =
  | (UsageViewCommonProps & { state: Exclude<UsageViewState, 'ready'>; data?: undefined })
  | (UsageViewCommonProps & { state: 'ready'; data: GetProfileUsageResponse });

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

type UsageRow = {
  key: string;
  /** Field label (schema `title` annotation). */
  label: string;
  /** Field caption (schema `description` annotation). */
  caption: string;
  /** Consumption as a whole percentage (`0`–`100`); `undefined` for an unlimited limit. */
  percent?: number;
  windowHours: number;
};

/** One display row per limit, shorter windows first. A `null` limit is reported as unlimited. */
const computeRows = (data: GetProfileUsageResponse, t: TFunction): UsageRow[] =>
  data.limits
    .map((limit): UsageRow => {
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
          windowHours,
        };
      }
      const percent = limit.limit > 0 ? Math.min(100, Math.round((used / limit.limit) * 100)) : used > 0 ? 100 : 0;
      return {
        key,
        label,
        caption: `${t('usage-percent-used.label', { percent })} · ${t('usage-limit.description', { used: formatAmount(used), limit: formatAmount(limit.limit), window })}`,
        percent,
        windowHours,
      };
    })
    .sort((left, right) => left.windowHours - right.windowHours);

/**
 * A single usage field: an optional number carrying its label/caption as `title`/`description`
 * annotations and the consumption percentage as its value. Optional so the form renders no required
 * markers; `Schema.Number` keeps the field context-free (`R = never`) so the struct stays assignable to `Form`.
 */
const usageField = (title: string, description: string) =>
  Schema.optional(Schema.Number.annotations({ title, description }));

/**
 * Build the Effect schema (one annotated field per limit) and matching values. Unlimited limits have no
 * value, so their field reads `undefined` and the renderer shows the "Unlimited" label instead of a meter.
 */
const buildUsageForm = (rows: UsageRow[]) => {
  const fields: Record<string, ReturnType<typeof usageField>> = {};
  const values: Record<string, number> = {};
  rows.forEach((row, index) => {
    const field = `metric_${index}`;
    fields[field] = usageField(row.label, row.caption);
    if (row.percent !== undefined) {
      values[field] = row.percent;
    }
  });
  return { schema: Schema.Struct(fields), values };
};

/** Non-data states shown as a single `Message`, keyed by message variant (translation keys for the copy). */
const STATE_MESSAGES = {
  unavailable: {
    valence: 'warning',
    icon: 'ph--cloud-slash--duotone',
    title: 'usage-unavailable.title',
    description: 'usage-unavailable.description',
  },
  error: {
    valence: 'error',
    icon: 'ph--cloud-x--duotone',
    title: 'usage-offline.title',
    description: 'usage-offline.description',
  },
  empty: {
    valence: 'neutral',
    icon: 'ph--chart-bar--duotone',
    title: 'usage-empty.title',
    description: 'usage-empty.description',
  },
} as const;

/**
 * Presentational view of profile usage: renders loading/error/unavailable/empty states, or a
 * schema-driven settings form (one read-only field per limit), plus a refresh control and a
 * collapsible raw-response viewer. Pure — all data via props.
 */
export const UsageView = ({ state, data, lastUpdated, onRefresh }: UsageViewProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [rawExpanded, setRawExpanded] = useState(false);

  const { schema, values, empty } = useMemo(() => {
    const rows = data ? computeRows(data, t) : [];
    return { ...buildUsageForm(rows), empty: rows.length === 0 };
  }, [data, t]);

  // Non-data states resolve to a `Message`; `loading` shows a spinner and `ready` with data shows the form.
  const message =
    state === 'unavailable'
      ? STATE_MESSAGES.unavailable
      : state === 'error'
        ? STATE_MESSAGES.error
        : state === 'ready' && empty
          ? STATE_MESSAGES.empty
          : undefined;

  // Render each metric as a meter from its percentage value; unlimited limits (no value) show a label.
  const meterFieldProvider = useCallback<FormFieldProvider>(
    ({ fieldProps: { label, description, getValue } }) => {
      const percent = getValue();
      return (
        <Form.Row label={label} description={description}>
          {typeof percent === 'number' ? (
            <Status progress={percent / 100} aria-label={t('usage-percent-used.label', { percent })} />
          ) : (
            t('usage-unlimited.label')
          )}
        </Form.Row>
      );
    },
    [t],
  );

  return (
    <Form.Root variant='settings' layout='static' schema={schema} values={values}>
      <Form.Viewport scroll>
        <Form.Content>
          <Form.Section title={t('usage-section.title')} description={t('usage-section.description')}>
            {message ? (
              <Message.Root valence={message.valence}>
                <Message.Title icon={message.icon}>{t(message.title)}</Message.Title>
                <Message.Content>{t(message.description)}</Message.Content>
              </Message.Root>
            ) : (
              <Form.FieldSet fieldProvider={meterFieldProvider} />
            )}
          </Form.Section>

          {/* {state === 'ready' && data && (
            <Form.Section>
              <Form.Row
                label={
                  lastUpdated !== undefined
                    ? t('usage-last-updated.label', { time: new Date(lastUpdated).toLocaleTimeString() })
                    : t('usage-refresh.label')
                }
              >
                {onRefresh && (
                  <IconButton
                    iconOnly
                    variant='ghost'
                    icon='ph--arrow-clockwise--regular'
                    label={t('usage-refresh.label')}
                    onClick={onRefresh}
                  />
                )}
              </Form.Row>
            </Form.Section>
          )} */}

          {/* {state === 'ready' && data && (
            <Form.Section>
              <Form.Row label={t('usage-raw-json.label')}>
                <ToggleIconButton
                  iconOnly
                  variant='ghost'
                  active={rawExpanded}
                  icon='ph--caret-right--regular'
                  label={t('usage-raw-json.label')}
                  onClick={() => setRawExpanded((value) => !value)}
                />
              </Form.Row>
              {rawExpanded && <JsonHighlighter data={data} testId='usage-raw-json' />}
            </Form.Section>
          )} */}
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

UsageView.displayName = 'UsageView';
