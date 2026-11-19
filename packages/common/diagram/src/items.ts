//
// Copyright 2026 DXOS.org
//

import type * as Semantic from './semantic.ts';

/**
 * The field of a component's `data` its rows are kept in. A component that lists things (a card's bullets, a row of
 * chips) reads this one field, so the text form has one spelling for a list: the braces after the node.
 */
export const ITEMS_FIELD = 'items';

const isScalar = (value: unknown): value is Semantic.Scalar =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

/** A row as a component's `data` keeps it: its text, and the row's own fields beside it. */
export const itemRecord = ({ text, data }: Semantic.Item): Record<string, Semantic.Scalar> => ({ ...data, text });

/** The rows a component's `data` holds, or `undefined` where it holds none it can say as text. */
export const itemsOf = (data: Readonly<Record<string, unknown>> | undefined): Semantic.Item[] | undefined => {
  const rows: unknown = data?.[ITEMS_FIELD];
  if (!Array.isArray(rows) || rows.length === 0) {
    return undefined;
  }
  const items: Semantic.Item[] = [];
  for (const row of rows) {
    const text: unknown = typeof row === 'object' && row !== null ? Reflect.get(row, 'text') : undefined;
    if (typeof text !== 'string') {
      return undefined;
    }
    const fields = Object.entries(row).filter(
      (entry): entry is [string, Semantic.Scalar] => entry[0] !== 'text' && isScalar(entry[1]),
    );
    items.push({ text, ...(fields.length > 0 ? { data: Object.fromEntries(fields) } : {}) });
  }
  return items;
};
