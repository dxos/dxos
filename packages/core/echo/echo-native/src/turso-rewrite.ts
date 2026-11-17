//
// Copyright 2026 DXOS.org
//

/**
 * Turso evaluates a WHERE clause's conjuncts in written order and does not seek on an `IN (subquery)`,
 * so echo-sqlite's compiled queries, which test the deletion cascade (a recursive subquery per row)
 * before the selective filter, run the cascade for every row of the space. This moves each
 * `NOT (<cascade>)` conjunct after the conjunct that follows it, so the cheap filter short-circuits
 * first. The result is the same set of rows: AND commutes, and both conjuncts are side-effect free.
 */
export const reorderCascades = (sql: string): string => {
  // Numbered, so each parameter stays bound to its expression wherever the expression moves.
  let out = numberParameters(sql);
  let from = 0;
  for (;;) {
    const start = out.indexOf(' AND NOT (', from);
    if (start < 0) {
      return out;
    }
    const cascadeOpen = start + ' AND NOT '.length;
    const cascadeClose = matching(out, cascadeOpen);
    if (cascadeClose < 0) {
      return out;
    }
    const next = ' AND (';
    if (out.startsWith(next, cascadeClose + 1)) {
      const filterOpen = cascadeClose + 1 + ' AND '.length;
      const filterClose = matching(out, filterOpen);
      if (filterClose < 0) {
        return out;
      }
      const cascade = out.slice(start, cascadeClose + 1);
      const filter = out.slice(cascadeClose + 1, filterClose + 1);
      out = out.slice(0, start) + filter + cascade + out.slice(filterClose + 1);
      from = start + filter.length + cascade.length;
    } else {
      from = cascadeClose + 1;
    }
  }
};

/** The index of the parenthesis closing the one at `open`, skipping string literals; -1 if unbalanced. */
const matching = (sql: string, open: number): number => {
  let depth = 0;
  for (let index = open; index < sql.length; index++) {
    const char = sql[index];
    if (char === "'") {
      index = sql.indexOf("'", index + 1);
      if (index < 0) {
        return -1;
      }
    } else if (char === '(') {
      depth++;
    } else if (char === ')') {
      depth--;
      if (depth === 0) {
        return index;
      }
    }
  }
  return -1;
};

/** Rewrites each positional `?` (outside string literals) as `?<n>`, its 1-based position. */
const numberParameters = (sql: string): string => {
  let out = '';
  let count = 0;
  for (let index = 0; index < sql.length; index++) {
    const char = sql[index];
    if (char === "'") {
      const end = sql.indexOf("'", index + 1);
      const stop = end < 0 ? sql.length : end + 1;
      out += sql.slice(index, stop);
      index = stop - 1;
    } else if (char === '?' && !/[0-9]/.test(sql[index + 1] ?? '')) {
      out += `?${++count}`;
    } else {
      out += char;
    }
  }
  return out;
};
