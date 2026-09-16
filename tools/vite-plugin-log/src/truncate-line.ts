//
// Copyright 2026 DXOS.org
//

/**
 * Safety cap on a single serialized log line so one huge context object can't bloat a flush.
 * Sized to hold a whole-collection sync state (~25 documents x 2 heads); the previous 2 KB
 * cut those in half, which is precisely when they are worth reading.
 */
export const MAX_LINE_LENGTH = 16_000;

/**
 * Shorten an over-long JSONL line while keeping it valid JSON.
 *
 * A blind `slice` cuts mid-string and leaves a line no parser can read — and it does so
 * silently, so the loss looks like an absent log rather than a truncated one. Instead drop
 * the context (the only unbounded field) and mark it, preserving every metadata field the
 * line is queried by.
 */
export const truncateLine = (line: string): string => {
  try {
    const entry = JSON.parse(line);
    const context = typeof entry.c === 'string' ? entry.c : undefined;
    const originalLength = context?.length ?? line.length;
    entry.c = JSON.stringify({
      truncated: true,
      originalLength,
      preview: context?.slice(0, MAX_LINE_LENGTH / 2),
    });
    const truncated = JSON.stringify(entry);
    if (truncated.length <= MAX_LINE_LENGTH) {
      return truncated;
    }
    entry.c = JSON.stringify({ truncated: true, originalLength });
    const withoutPreview = JSON.stringify(entry);
    if (withoutPreview.length <= MAX_LINE_LENGTH) {
      return withoutPreview;
    }

    // Metadata alone overflows (a pathological `m` or `f`). Keep only the fields a query
    // filters on, each capped, so the cap is a guarantee rather than a best effort.
    return JSON.stringify({
      t: entry.t,
      l: entry.l,
      m: typeof entry.m === 'string' ? entry.m.slice(0, MAX_LINE_LENGTH / 4) : entry.m,
      i: entry.i,
      c: JSON.stringify({ truncated: true, originalLength }),
    });
  } catch {
    // Unparseable is not expected (we just serialized it), but a dropped line beats a corrupt one.
    return JSON.stringify({ truncated: true, originalLength: line.length });
  }
};
