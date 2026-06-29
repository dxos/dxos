//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Format, TypeEnum } from '@dxos/echo/Format';
import { IconButton, Message, Status, useTranslation } from '@dxos/react-ui';
import { Form, type FormFieldProvider, formatForDisplay } from '@dxos/react-ui-form';

import { meta } from '../../meta';
import { Ibkr } from '../../types';

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
  const { t } = useTranslation(meta.profile.key);

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
              <Form.Row key={concept} label={formatConceptLabel(concept)}>
                {formatFundamentalValue(Format.TypeFormat.Currency, concept, factValue)}
              </Form.Row>
            ))}
          </>
        );
      }
      if (typeof value !== 'number') {
        return null;
      }
      return (
        <Form.Row label={label} description={description}>
          {formatFundamentalValue(format, jsonPath, value)}
        </Form.Row>
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
        <Form.Section>
          <div className='flex items-start justify-between gap-trim-md pb-form-section-gap'>
            <div className='flex min-w-0 flex-col gap-0.5'>
              <h2 className='text-lg'>{t('fundamentals.heading')}</h2>
              {asOfDescription && <p className='text-description'>{asOfDescription}</p>}
            </div>
            {onRefresh ? (
              <IconButton
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
            <Status indeterminate aria-label={t('fundamentals.heading')} />
          ) : error ? (
            <Message.Root valence='error'>
              <Message.Title icon='ph--warning-circle--duotone'>{t('fundamentals.heading')}</Message.Title>
              <Message.Content>{error}</Message.Content>
            </Message.Root>
          ) : empty ? (
            <Message.Root valence='neutral'>
              <Message.Title icon='ph--chart-bar--duotone'>{t('fundamentals.heading')}</Message.Title>
              <Message.Content>{t('fundamentals.empty.label')}</Message.Content>
            </Message.Root>
          ) : (
            <Form.FieldSet readonly fieldProvider={fieldProvider} />
          )}
        </Form.Section>

        <Form.Section>
          <Form.Row label={t('fundamentals.source.label')} />
        </Form.Section>
      </Form.Content>
    </Form.Root>
  );
};
