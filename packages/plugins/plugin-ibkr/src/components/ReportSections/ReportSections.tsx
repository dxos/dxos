//
// Copyright 2026 DXOS.org
//

import React, { Fragment } from 'react';

import { Grid, Separator, Tag, useTranslation } from '@dxos/react-ui';

import { meta } from '../../meta';
import { type Ibkr } from '../../types';

export type ReportSectionsProps = {
  positions: readonly Ibkr.Position[];
  trades: readonly Ibkr.Trade[];
  cash: readonly Ibkr.Cash[];
  openLots: readonly Ibkr.Lot[];
  closedLots: readonly Ibkr.Lot[];
};

const SECTION = 'gap-x-5 gap-y-1.5 px-4 pb-2';
const HEADING = 'px-4 pt-3 pb-1 text-sm font-medium text-description';
const HEADER_CELL = 'text-xs text-subdued';

/** Converts IBKR's "YYYYMMDD" or "YYYYMMDD;HH:MM:SS" trade date to "YYYY-MM-DD". */
const formatDate = (raw: string | undefined): string => {
  if (!raw) {
    return '—';
  }
  const date = raw.split(';')[0];
  return date.length === 8 ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}` : date;
};

const formatNumber = (value: number | undefined): string =>
  value === undefined ? '—' : value.toLocaleString(undefined, { maximumFractionDigits: 2 });

const formatPnl = (value: number | undefined): string => {
  if (value === undefined) {
    return '—';
  }
  const formatted = formatNumber(value);
  return value >= 0 ? `+${formatted}` : formatted;
};

/**
 * Long-term when a lot is held more than one year (sold strictly after the one-year anniversary of
 * acquisition). Indicative only — derived from the YYYYMMDD date prefixes, not IBKR's own holding-period
 * field. Returns undefined when either date is missing.
 */
const holdingTerm = (acquired: string | undefined, sold: string | undefined): 'long' | 'short' | undefined => {
  const acquiredYmd = acquired?.slice(0, 8);
  const soldYmd = sold?.slice(0, 8);
  if (!acquiredYmd || acquiredYmd.length < 8 || !soldYmd || soldYmd.length < 8) {
    return undefined;
  }
  const anniversary = `${Number(acquiredYmd.slice(0, 4)) + 1}${acquiredYmd.slice(4, 8)}`;
  return soldYmd > anniversary ? 'long' : 'short';
};

/**
 * Presentational tables for the parsed sections of an Interactive Brokers Flex report: aggregated open
 * positions, recent trades, and cash balances, plus — when the query emits lot detail — the per-lot
 * breakdown (the tax-relevant unit) and realized closed lots for tax reporting. Numeric columns are
 * right-aligned.
 */
export const ReportSections = ({ positions, trades, cash, openLots, closedLots }: ReportSectionsProps) => {
  const { t } = useTranslation(meta.profile.key);

  // TODO(dmaretskyi): Use react-ui-table.
  return (
    <>
      <h2 className={HEADING}>{t('positions.heading', { count: positions.length })}</h2>
      <Grid cols={7} grow={false} classNames={SECTION}>
        <span className={HEADER_CELL}>{t('position.symbol.label')}</span>
        <span className={`${HEADER_CELL} text-right`}>{t('position.quantity.label')}</span>
        <span className={`${HEADER_CELL} text-right`}>{t('position.mark-price.label')}</span>
        <span className={`${HEADER_CELL} text-right`}>{t('position.cost-basis.label')}</span>
        <span className={`${HEADER_CELL} text-right`}>{t('position.value.label')}</span>
        <span className={`${HEADER_CELL} text-right`}>{t('position.pnl.label')}</span>
        <span className={HEADER_CELL}>{t('position.currency.label')}</span>
        {positions.map((position, index) => (
          <Fragment key={index}>
            <span>{position.symbol}</span>
            <span className='text-right'>{formatNumber(position.quantity)}</span>
            <span className='text-right'>{formatNumber(position.markPrice)}</span>
            <span className='text-right'>{formatNumber(position.costBasis)}</span>
            <span className='text-right'>{formatNumber(position.positionValue)}</span>
            <span className='text-right'>{formatPnl(position.unrealizedPnl)}</span>
            <span>{position.currency}</span>
          </Fragment>
        ))}
      </Grid>

      {openLots.length > 0 && (
        <>
          <Separator />
          <h2 className={HEADING}>{t('open-lots.heading', { count: openLots.length })}</h2>
          <Grid cols={7} grow={false} classNames={SECTION}>
            <span className={HEADER_CELL}>{t('lot.symbol.label')}</span>
            <span className={HEADER_CELL}>{t('lot.acquired.label')}</span>
            <span className={`${HEADER_CELL} text-right`}>{t('lot.quantity.label')}</span>
            <span className={`${HEADER_CELL} text-right`}>{t('lot.cost-basis.label')}</span>
            <span className={`${HEADER_CELL} text-right`}>{t('lot.value.label')}</span>
            <span className={`${HEADER_CELL} text-right`}>{t('lot.pnl.label')}</span>
            <span className={HEADER_CELL}>{t('lot.currency.label')}</span>
            {openLots.map((lot, index) => (
              <Fragment key={index}>
                <span>{lot.symbol}</span>
                <span>{formatDate(lot.acquired)}</span>
                <span className='text-right'>{formatNumber(lot.quantity)}</span>
                <span className='text-right'>{formatNumber(lot.costBasis)}</span>
                <span className='text-right'>{formatNumber(lot.value)}</span>
                <span className='text-right'>{formatPnl(lot.unrealizedPnl)}</span>
                <span>{lot.currency}</span>
              </Fragment>
            ))}
          </Grid>
        </>
      )}

      <Separator />

      <h2 className={HEADING}>{t('trades.heading', { count: trades.length })}</h2>
      <Grid cols={5} grow={false} classNames={SECTION}>
        <span className={HEADER_CELL}>{t('trade.date.label')}</span>
        <span className={HEADER_CELL}>{t('trade.symbol.label')}</span>
        <span className={HEADER_CELL}>{t('trade.side.label')}</span>
        <span className={`${HEADER_CELL} text-right`}>{t('trade.quantity.label')}</span>
        <span className={`${HEADER_CELL} text-right`}>{t('trade.price.label')}</span>
        {trades.map((trade, index) => (
          <Fragment key={index}>
            <span>{formatDate(trade.date)}</span>
            <span>{trade.symbol}</span>
            <span>
              <Tag hue={trade.side === 'BUY' ? 'green' : 'red'}>{trade.side}</Tag>
            </span>
            <span className='text-right'>{formatNumber(Math.abs(trade.quantity))}</span>
            <span className='text-right'>{formatNumber(trade.price)}</span>
          </Fragment>
        ))}
      </Grid>

      {closedLots.length > 0 && (
        <>
          <Separator />
          <h2 className={HEADING}>{t('realized.heading', { count: closedLots.length })}</h2>
          <Grid cols={9} grow={false} classNames={SECTION}>
            <span className={HEADER_CELL}>{t('realized.symbol.label')}</span>
            <span className={HEADER_CELL}>{t('realized.acquired.label')}</span>
            <span className={HEADER_CELL}>{t('realized.sold.label')}</span>
            <span className={`${HEADER_CELL} text-right`}>{t('realized.quantity.label')}</span>
            <span className={`${HEADER_CELL} text-right`}>{t('realized.proceeds.label')}</span>
            <span className={`${HEADER_CELL} text-right`}>{t('realized.cost-basis.label')}</span>
            <span className={`${HEADER_CELL} text-right`}>{t('realized.gain.label')}</span>
            <span className={HEADER_CELL}>{t('realized.term.label')}</span>
            <span className={HEADER_CELL}>{t('realized.currency.label')}</span>
            {closedLots.map((lot, index) => {
              const term = holdingTerm(lot.acquired, lot.sold);
              return (
                <Fragment key={index}>
                  <span>{lot.symbol}</span>
                  <span>{formatDate(lot.acquired)}</span>
                  <span>{formatDate(lot.sold)}</span>
                  <span className='text-right'>{formatNumber(Math.abs(lot.quantity))}</span>
                  <span className='text-right'>{formatNumber(lot.proceeds)}</span>
                  <span className='text-right'>{formatNumber(lot.costBasis)}</span>
                  <span className='text-right'>{formatPnl(lot.realizedPnl)}</span>
                  <span>{term ? t(`term.${term}.label`) : '—'}</span>
                  <span>{lot.currency}</span>
                </Fragment>
              );
            })}
          </Grid>
        </>
      )}

      <Separator />

      <h2 className={HEADING}>{t('cash.heading')}</h2>
      <Grid cols={2} grow={false} classNames={SECTION}>
        <span className={HEADER_CELL}>{t('cash.currency.label')}</span>
        <span className={`${HEADER_CELL} text-right`}>{t('cash.ending-cash.label')}</span>
        {cash.map((entry, index) => (
          <Fragment key={index}>
            <span>{entry.currency}</span>
            <span className='text-right'>{formatNumber(entry.endingCash)}</span>
          </Fragment>
        ))}
      </Grid>
    </>
  );
};
