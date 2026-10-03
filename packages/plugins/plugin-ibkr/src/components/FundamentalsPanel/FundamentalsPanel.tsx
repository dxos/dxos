//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Format, TypeEnum } from '@dxos/echo/Format';
import { Form, type FormFieldProvider } from '@dxos/react-ui-form';
import * as Banner from '@dxos/react-ui/Banner';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Progress from '@dxos/react-ui/Progress';
import { formatForDisplay } from '@dxos/schema';

import { Ibkr } from '#types';

import { meta } from '../../meta.ts';

export type FundamentalsPanelProps = {
  snapshot?: Ibkr.FundamentalsSnapshot;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
};

const hasAdditionalFacts = (snapshot?: Ibkr.FundamentalsSnapshot): boolean =>
  snapshot?.additional?.additionalFacts != null && Object.keys(snapshot.additional.additionalFacts).length > 0;

const hasMetrics = (snapshot?: Ibkr.FundamentalsSnapshot): boolean =>
  snapshot != null &&
  ([
    snapshot.valuation?.marketCap,
    snapshot.valuation?.pe,
    snapshot.valuation?.pb,
    snapshot.performance?.revenue,
    snapshot.performance?.netIncome,
    snapshot.performance?.eps,
    snapshot.ratios?.roe,
    snapshot.ratios?.debtToEquity,
  ].some((value) => value != null) ||
    hasAdditionalFacts(snapshot));

/** Humanize an XBRL concept name for display, e.g. `StockholdersEquity` → `Stockholders Equity`. */
const formatConceptLabel = (concept: string): string => concept.replace(/([A-Z])/g, ' $1').trim();

/** debtToEquity is a plain ratio, not currency or percent — format as a plain decimal. */
const formatFundamentalValue = (
  format: Format.TypeFormat | undefined,
  jsonPath: string | undefined,
  value: number,
): string => {
  if (jsonPath?.endsWith('debtToEquity')) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return formatForDisplay({ type: TypeEnum.Number, format, value, compact: true });
};

/** Read-only panel for SEC EDGAR fundamentals returned by {@link IbkrOperation.GetInstrumentFundamentals}. */
export const FundamentalsPanel = ({ snapshot, loading, error, onRefresh }: FundamentalsPanelProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);

  const fieldProvider = useCallback<FormFieldProvider>(
    ({ prop, fieldProps: { label, description, getValue, format, jsonPath } }) => {
      const value = getValue();
      if (prop === 'additionalFacts' && value != null && typeof value === 'object' && !Array.isArray(value)) {
        const entries = Object.entries(value as Record<string, number>).sort(([left], [right]) =>
          left.localeCompare(right),
        );
        if (entries.length === 0) {
          return null;
        }
        return (
          <>
            {entries.map(([concept, factValue]) => (
              <Form.Field standalone key={concept} label={formatConceptLabel(concept)}>
                {formatFundamentalValue(Format.TypeFormat.Currency, concept, factValue)}
              </Form.Field>
            ))}
          </>
        );
      }
      if (typeof value !== 'number') {
        return null;
      }
      return (
        <Form.Field standalone label={label} description={description}>
          {formatFundamentalValue(format, jsonPath, value)}
        </Form.Field>
      );
    },
    [],
  );

  const asOfDescription = useMemo(
    () => (snapshot?.asOf ? t('fundamentals.as-of.label', { date: snapshot.asOf }) : undefined),
    [snapshot?.asOf, t],
  );

  const empty = !hasMetrics(snapshot);

  return (
    <Form.Root layout='static' readonly schema={Ibkr.FundamentalsSnapshot} values={snapshot}>
      <Form.Content>
        <Form.FieldSet>
          <div className='flex items-start justify-between gap-trim-md pb-form-section-gap'>
            <div className='flex min-w-0 flex-col gap-0.5'>
              <h2 className='text-lg'>{t('fundamentals.heading')}</h2>
              {asOfDescription && <p className='text-fg-muted'>{asOfDescription}</p>}
            </div>
            {onRefresh ? (
              <Button.Button
                iconOnly
                variant='ghost'
                icon='ph--arrows-clockwise--regular'
                label={t('fundamentals.refresh.label')}
                onClick={onRefresh}
                disabled={loading}
              />
            ) : null}
          </div>

          {loading ? (
            <Progress.Progress indeterminate label={t('fundamentals.heading')} />
          ) : error ? (
            <Banner.Root valence='error'>
              <Banner.Title icon='ph--warning-circle--duotone'>{t('fundamentals.heading')}</Banner.Title>
              <Banner.Body>{error}</Banner.Body>
            </Banner.Root>
          ) : empty ? (
            <Banner.Root valence='neutral'>
              <Banner.Title icon='ph--chart-bar--duotone'>{t('fundamentals.heading')}</Banner.Title>
              <Banner.Body>{t('fundamentals.empty.label')}</Banner.Body>
            </Banner.Root>
          ) : (
            <Form.Fields readonly fieldProvider={fieldProvider} />
          )}
        </Form.FieldSet>

        <Form.FieldSet>
          <Form.Field label={t('fundamentals.source.label')} />
        </Form.FieldSet>
      </Form.Content>
    </Form.Root>
  );
};
