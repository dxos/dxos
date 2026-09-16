//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { mx } from '@dxos/ui-theme';
import { Unit as BaseUnit } from '@dxos/util';

import { type QueryInfo, removeEmpty } from '../../hooks/index.ts';

export const SLOW_TIME = 250;

export const Duration = ({ duration }: { duration: number }) => (
  <span className={mx(duration > SLOW_TIME && 'text-error-text')}>{String(BaseUnit.Duration(duration))}</span>
);

export const Unit = {
  KB: (value?: number) => ((value ?? 0) / 1_000).toFixed(2),
};

/** Suffix naming the averaging window of a rate, e.g. ` (10s)`. */
export const rateInterval = (seconds?: number): string => (seconds ? ` (${seconds}s)` : '');

/** Groups queries by their filter shape (options and type identity stripped) and counts each shape. */
export const groupQueriesByFilter = (queries: QueryInfo[] = []): Map<string, number> =>
  queries.reduce((acc, query) => {
    const raw = removeEmpty(query.filter);
    delete raw.options;
    raw.type = raw.type?.itemId;
    const key = JSON.stringify(raw);
    acc.set(key, (acc.get(key) ?? 0) + 1);
    return acc;
  }, new Map<string, number>());
