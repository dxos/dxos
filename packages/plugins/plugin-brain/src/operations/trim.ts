//
// Copyright 2026 DXOS.org
//

// 50 rows of a few columns at most 500 characters each keeps one tool result within a few thousand tokens, so a
// broad query cannot flood the model's context; the rest is reached by paging.
/** Maximum rows any fact tool returns to the model in one call. */
export const AGENT_MAX_ROWS = 50;

/** Maximum characters of one string value returned to the model; longer values are cut. */
export const AGENT_MAX_VALUE_CHARS = 500;

/** Cuts a string to {@link AGENT_MAX_VALUE_CHARS}, recording that it did. */
export type Clip = (value: string) => string;

export type TrimOptions<T> = {
  /** Shortens the row's string values with `clip`. */
  clipRow: (row: T, clip: Clip) => T;
  /** Number of results the query produced in total; defaults to the rows given. */
  total?: number;
  /** Position of the first given row in the full result. */
  offset?: number;
  /** How the model reads the next window, given the offset it starts at. */
  paging: (nextOffset: number) => string;
};

export type Trimmed<T> = {
  rows: T[];
  /** Present when anything was cut: says what, and how to read the rest. */
  note?: string;
};

/**
 * Bounds a result for the model: at most {@link AGENT_MAX_ROWS} rows and {@link AGENT_MAX_VALUE_CHARS} per value,
 * with a note whenever anything was left out, so the model pages with windowed reads rather than assuming it saw all.
 */
export const trimForAgent = <T>(
  rows: readonly T[],
  { clipRow, total = rows.length, offset = 0, paging }: TrimOptions<T>,
): Trimmed<T> => {
  let clipped = false;
  const clip: Clip = (value) => {
    if (value.length <= AGENT_MAX_VALUE_CHARS) {
      return value;
    }
    clipped = true;
    return `${value.slice(0, AGENT_MAX_VALUE_CHARS)}…`;
  };

  const shown = rows.slice(0, AGENT_MAX_ROWS).map((row) => clipRow(row, clip));
  const notes: string[] = [];
  if (offset + shown.length < total) {
    const range = offset > 0 ? `rows ${offset + 1}-${offset + shown.length}` : `${shown.length}`;
    notes.push(`Output truncated: showing ${range} of ${total} rows. ${paging(offset + shown.length)}`);
  }
  if (clipped) {
    notes.push(
      `Values longer than ${AGENT_MAX_VALUE_CHARS} characters were cut and end in "…"; select narrower values to read them.`,
    );
  }

  return notes.length > 0 ? { rows: shown, note: notes.join(' ') } : { rows: shown };
};
