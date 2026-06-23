//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useMemo, useState } from 'react';

import { type GetProfileUsageResponse, type MeteringLimit, type MeteringUsageItem } from '@dxos/protocols';
import { IconButton, Message, Status, ToggleIconButton, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
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

type UsageRow = {
  key: string;
  /** Field label (schema `title` annotation). */
  label: string;
  /** Field caption (schema `description` annotation). */
  caption: string;
  /** Field value, rendered as static text (e.g. "26% used", "Unlimited"). */
  value: string;
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
          value: t('usage-unlimited.label'),
          windowHours,
        };
      }
      const percent = limit.limit > 0 ? Math.min(100, Math.round((used / limit.limit) * 100)) : used > 0 ? 100 : 0;
      return {
        key,
        label,
        caption: t('usage-limit.description', { used: formatAmount(used), limit: formatAmount(limit.limit), window }),
        value: t('usage-percent-used.label', { percent }),
        windowHours,
      };
    })
    .sort((a, b) => a.windowHours - b.windowHours);

/**
 * A single read-only usage field: an optional string carrying its label/caption as `title`/`description`
 * annotations. Optional so the read-only form renders no required markers; `Schema.String` keeps the
 * field context-free (`R = never`) so the struct stays assignable to `Form`.
 */
const usageField = (title: string, description: string) =>
  Schema.optional(Schema.String.annotations({ title, description }));

/**
 * Build the Effect schema (one annotated field per limit) and matching values for generic
 * `Form.FieldSet` rendering.
 */
const buildUsageForm = (rows: UsageRow[]) => {
  const fields: Record<string, ReturnType<typeof usageField>> = {};
  const values: Record<string, string> = {};
  rows.forEach((row, index) => {
    const field = `metric_${index}`;
    fields[field] = usageField(row.label, row.caption);
    values[field] = row.value;
  });
  return { schema: Schema.Struct(fields), values };
};

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

  return (
    <Form.Root variant='settings' layout='static' schema={schema} values={values}>
      <Form.Viewport scroll>
        <Form.Content>
          <Form.Section title={t('usage-section.title')} description={t('usage-section.description')}>
            {state === 'unavailable' ? (
              <Message.Root valence='warning'>
                <Message.Title icon='ph--cloud-slash--duotone'>{t('usage-unavailable.title')}</Message.Title>
                <Message.Content>{t('usage-unavailable.description')}</Message.Content>
              </Message.Root>
            ) : state === 'loading' ? (
              <Status indeterminate aria-label={t('usage-section.title')} />
            ) : state === 'error' ? (
              <Message.Root valence='error'>
                <Message.Title icon='ph--cloud-x--duotone'>{t('usage-offline.title')}</Message.Title>
                <Message.Content>{t('usage-offline.description')}</Message.Content>
              </Message.Root>
            ) : empty ? (
              <Message.Root valence='neutral'>
                <Message.Title icon='ph--chart-bar--duotone'>{t('usage-empty.title')}</Message.Title>
                <Message.Content>{t('usage-empty.description')}</Message.Content>
              </Message.Root>
            ) : (
              <Form.FieldSet />
            )}
          </Form.Section>

          {state === 'ready' && data && (
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
          )}

          {state === 'ready' && data && (
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
              {rawExpanded && <JsonHighlighter data={data} />}
            </Form.Section>
          )}
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};
