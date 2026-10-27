//
// Copyright 2026 DXOS.org
//

import { type Row, type Term, XSD } from '../terms.ts';

const NUMERIC = new Set([`${XSD}integer`, `${XSD}decimal`, `${XSD}double`, `${XSD}float`, `${XSD}long`, `${XSD}int`]);

/**
 * Canonical string of a term so results from different engines compare equal.
 * Numeric literals compare by value (engines differ on `1.0` vs `1`, integer vs decimal for COUNT).
 */
export const termKey = (term: Term | undefined): string => {
  if (!term) {
    return '_';
  }
  switch (term.termType) {
    case 'NamedNode':
      return `<${term.value}>`;
    case 'BlankNode':
      return '_:b';
    case 'Literal': {
      if (term.datatype && NUMERIC.has(term.datatype)) {
        // 15 significant digits: engines computing decimals in doubles differ beyond that.
        return `#${Number(Number(term.value).toPrecision(15))}`;
      }
      const dt = term.datatype && term.datatype !== `${XSD}string` ? `^^${term.datatype}` : '';
      return `"${term.value}"${term.language ? `@${term.language}` : ''}${dt}`;
    }
  }
};

/** Order-insensitive FNV-1a checksum over result rows (row order is not part of SELECT semantics). */
export const checksumRows = (rows: readonly Row[]): string => {
  const keys = rows.map((row) =>
    Object.keys(row)
      .filter((name) => row[name] !== undefined)
      .sort()
      .map((name) => `${name}=${termKey(row[name])}`)
      .join('|'),
  );
  keys.sort();
  let hash = 0x811c9dc5;
  for (const key of keys) {
    for (let index = 0; index < key.length; index++) {
      hash ^= key.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    hash ^= 0x0a;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};
