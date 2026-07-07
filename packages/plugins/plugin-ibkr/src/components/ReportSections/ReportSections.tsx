//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { Format } from '@dxos/echo/Format';
import { Select, useTranslation } from '@dxos/react-ui';
import { DynamicTable, type TablePropertyDefinition } from '@dxos/react-ui-table';

import { meta } from '../../meta';
import { type Ibkr } from '../../types';

export type ReportSectionsProps = {
  positions: readonly Ibkr.Position[];
  trades: readonly Ibkr.Trade[];
  cash: readonly Ibkr.Cash[];
  openLots: readonly Ibkr.Lot[];
  closedLots: readonly Ibkr.Lot[];
};

type Section = {
  id: string;
  label: string;
  properties: TablePropertyDefinition[];
  rows: any[];
};

/**
 * Read view of a parsed Interactive Brokers Flex report. dx-grid is a single full-height virtualized
 * grid, so the heterogeneous sections (positions, lots, trades, realized, cash) are surfaced through a
 * section Select driving one {@link DynamicTable} rather than stacked as separate grids. Numeric
 * columns are formatted by the table's number format; dates and P&L are normalized into the row data.
 */
export const ReportSections = ({ positions, trades, cash, openLots, closedLots }: ReportSectionsProps) => {
  const { t } = useTranslation(meta.profile.key);

  const sections = useMemo<Section[]>(() => {
    const all: (Section | false)[] = [
      {
        id: 'positions',
        label: t('positions.heading', { count: positions.length }),
        properties: [
          { name: 'symbol', format: Format.TypeFormat.String, title: t('position.symbol.label') },
          { name: 'quantity', format: Format.TypeFormat.Number, title: t('position.quantity.label') },
          { name: 'markPrice', format: Format.TypeFormat.Number, title: t('position.mark-price.label') },
          { name: 'costBasis', format: Format.TypeFormat.Number, title: t('position.cost-basis.label') },
          { name: 'value', format: Format.TypeFormat.Number, title: t('position.value.label') },
          { name: 'pnl', format: Format.TypeFormat.Number, title: t('position.pnl.label') },
          { name: 'currency', format: Format.TypeFormat.String, title: t('position.currency.label'), size: 80 },
        ],
        rows: positions.map((position, index) => ({
          id: String(index),
          symbol: position.symbol,
          quantity: position.quantity,
          markPrice: position.markPrice,
          costBasis: position.costBasis,
          value: position.positionValue,
          pnl: position.unrealizedPnl,
          currency: position.currency,
        })),
      },
      openLots.length > 0 && {
        id: 'openLots',
        label: t('open-lots.heading', { count: openLots.length }),
        properties: [
          { name: 'symbol', format: Format.TypeFormat.String, title: t('lot.symbol.label') },
          { name: 'acquired', format: Format.TypeFormat.String, title: t('lot.acquired.label') },
          { name: 'quantity', format: Format.TypeFormat.Number, title: t('lot.quantity.label') },
          { name: 'costBasis', format: Format.TypeFormat.Number, title: t('lot.cost-basis.label') },
          { name: 'value', format: Format.TypeFormat.Number, title: t('lot.value.label') },
          { name: 'pnl', format: Format.TypeFormat.Number, title: t('lot.pnl.label') },
          { name: 'currency', format: Format.TypeFormat.String, title: t('lot.currency.label'), size: 80 },
        ],
        rows: openLots.map((lot, index) => ({
          id: String(index),
          symbol: lot.symbol,
          acquired: formatDate(lot.acquired),
          quantity: lot.quantity,
          costBasis: lot.costBasis,
          value: lot.value,
          pnl: lot.unrealizedPnl,
          currency: lot.currency,
        })),
      },
      {
        id: 'trades',
        label: t('trades.heading', { count: trades.length }),
        properties: [
          { name: 'date', format: Format.TypeFormat.String, title: t('trade.date.label') },
          { name: 'symbol', format: Format.TypeFormat.String, title: t('trade.symbol.label') },
          { name: 'side', format: Format.TypeFormat.String, title: t('trade.side.label'), size: 80 },
          { name: 'quantity', format: Format.TypeFormat.Number, title: t('trade.quantity.label') },
          { name: 'price', format: Format.TypeFormat.Number, title: t('trade.price.label') },
        ],
        rows: trades.map((trade, index) => ({
          id: String(index),
          date: formatDate(trade.date),
          symbol: trade.symbol,
          side: trade.side,
          quantity: Math.abs(trade.quantity),
          price: trade.price,
        })),
      },
      closedLots.length > 0 && {
        id: 'closedLots',
        label: t('realized.heading', { count: closedLots.length }),
        properties: [
          { name: 'symbol', format: Format.TypeFormat.String, title: t('realized.symbol.label') },
          { name: 'acquired', format: Format.TypeFormat.String, title: t('realized.acquired.label') },
          { name: 'sold', format: Format.TypeFormat.String, title: t('realized.sold.label') },
          { name: 'quantity', format: Format.TypeFormat.Number, title: t('realized.quantity.label') },
          { name: 'proceeds', format: Format.TypeFormat.Number, title: t('realized.proceeds.label') },
          { name: 'costBasis', format: Format.TypeFormat.Number, title: t('realized.cost-basis.label') },
          { name: 'pnl', format: Format.TypeFormat.Number, title: t('realized.gain.label') },
          { name: 'term', format: Format.TypeFormat.String, title: t('realized.term.label'), size: 80 },
          { name: 'currency', format: Format.TypeFormat.String, title: t('realized.currency.label'), size: 80 },
        ],
        rows: closedLots.map((lot, index) => {
          const term = holdingTerm(lot.acquired, lot.sold);
          return {
            id: String(index),
            symbol: lot.symbol,
            acquired: formatDate(lot.acquired),
            sold: formatDate(lot.sold),
            quantity: Math.abs(lot.quantity),
            proceeds: lot.proceeds,
            costBasis: lot.costBasis,
            pnl: lot.realizedPnl,
            term: term ? t(`term.${term}.label`) : '—',
            currency: lot.currency,
          };
        }),
      },
      {
        id: 'cash',
        label: t('cash.heading'),
        properties: [
          { name: 'currency', format: Format.TypeFormat.String, title: t('cash.currency.label') },
          { name: 'endingCash', format: Format.TypeFormat.Number, title: t('cash.ending-cash.label') },
        ],
        rows: cash.map((entry, index) => ({
          id: String(index),
          currency: entry.currency,
          endingCash: entry.endingCash,
        })),
      },
    ];
    return all.filter((section): section is Section => section !== false);
  }, [t, positions, trades, cash, openLots, closedLots]);

  const [selected, setSelected] = useState(sections[0]?.id);
  // Keep the selection valid as available sections change (e.g. lots appear/disappear between reports).
  useEffect(() => {
    if (!sections.some((section) => section.id === selected)) {
      setSelected(sections[0]?.id);
    }
  }, [sections, selected]);

  const active = sections.find((section) => section.id === selected) ?? sections[0];

  return (
    <div className='grid grid-rows-[min-content_1fr] min-bs-0 bs-full'>
      <div className='p-2'>
        <Select.Root value={active?.id} onValueChange={setSelected}>
          <Select.TriggerButton />
          <Select.Portal>
            <Select.Content>
              <Select.Viewport>
                {sections.map((section) => (
                  <Select.Option key={section.id} value={section.id}>
                    {section.label}
                  </Select.Option>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>
      {active && (
        // Distinct typename per section so the ephemeral table schemas do not collide in the registry.
        <DynamicTable
          name={`org.dxos.plugin.ibkr.report.${active.id}`}
          properties={active.properties}
          rows={active.rows}
        />
      )}
    </div>
  );
};

/** Converts IBKR's "YYYYMMDD" or "YYYYMMDD;HH:MM:SS" trade date to "YYYY-MM-DD". */
const formatDate = (raw: string | undefined): string => {
  if (!raw) {
    return '—';
  }
  const date = raw.split(';')[0];
  return date.length === 8 ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}` : date;
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
