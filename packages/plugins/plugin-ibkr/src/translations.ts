//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';

import { meta } from './meta';
import { Ibkr } from './types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Ibkr.Portfolio)]: {
        'typename.label': 'Interactive Brokers',
        'typename.label_zero': 'Interactive Brokers',
        'typename.label_one': 'Interactive Brokers',
        'typename.label_other': 'Interactive Brokers',
        'object-name.placeholder': 'Interactive Brokers',
        'add-object.label': 'Interactive Brokers',
        'rename-object.label': 'Rename portfolio',
        'delete-object.label': 'Delete portfolio',
        'object-deleted.label': 'Portfolio deleted',
      },
      [meta.profile.key]: {
        'plugin.name': 'Interactive Brokers',
        'sync.label': 'Sync',
        'syncing.label': 'Syncing…',
        'daily-sync.label': 'Daily sync',
        'report.companion.label': 'Report detail',
        'reports.label': 'Reports',
        'report-row.label': '{{date}} — {{positions}} positions · {{trades}} trades · {{cash}} cash',
        'positions.heading': 'Open positions ({{count}})',
        'trades.heading': 'Trades ({{count}})',
        'cash.heading': 'Cash',
        'position.symbol.label': 'Symbol',
        'position.quantity.label': 'Qty',
        'position.mark-price.label': 'Mark price',
        'position.cost-basis.label': 'Cost basis',
        'position.value.label': 'Value',
        'position.pnl.label': 'P&L',
        'position.currency.label': 'CCY',
        'trade.date.label': 'Date',
        'trade.symbol.label': 'Symbol',
        'trade.side.label': 'Side',
        'trade.quantity.label': 'Qty',
        'trade.price.label': 'Price',
        'cash.currency.label': 'Currency',
        'cash.ending-cash.label': 'Ending cash',
        'open-lots.heading': 'Open lots ({{count}})',
        'lot.symbol.label': 'Symbol',
        'lot.acquired.label': 'Acquired',
        'lot.quantity.label': 'Qty',
        'lot.cost-basis.label': 'Cost basis',
        'lot.value.label': 'Value',
        'lot.pnl.label': 'Unrealized',
        'lot.currency.label': 'CCY',
        'realized.heading': 'Realized gains ({{count}})',
        'realized.symbol.label': 'Symbol',
        'realized.acquired.label': 'Acquired',
        'realized.sold.label': 'Sold',
        'realized.quantity.label': 'Qty',
        'realized.proceeds.label': 'Proceeds',
        'realized.cost-basis.label': 'Cost basis',
        'realized.gain.label': 'Gain/Loss',
        'realized.term.label': 'Term',
        'realized.currency.label': 'CCY',
        'term.long.label': 'Long',
        'term.short.label': 'Short',
        'copy-xml.label': 'Copy raw XML',
        'copied.label': 'Copied',
      },
    },
  },
];
