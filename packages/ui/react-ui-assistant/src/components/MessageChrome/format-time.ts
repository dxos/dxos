//
// Copyright 2026 DXOS.org
//

// Kept out of `BranchWidget.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

/**
 * Relative ("5 min ago", "yesterday") within two days, absolute date beyond that. The exact
 * timestamp is always available via the `title` tooltip.
 *
 * Recent prompts are the ones a reader places by elapsed time; older ones by date.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

export type FormatTimeOptions = {
  now?: number;
  /** Rendered for anything under a minute — translated by the caller ("just now"). */
  justNow?: string;
};

/**
 * Relative time for the message toolbars: `justNow` (caller-translated) under a minute, relative
 * ("5 min ago", "yesterday") within two days, an absolute date beyond that. `now` defaults to the
 * wall clock; an invalid timestamp renders as the empty string.
 */
export const formatTime = (created: string, { now = Date.now(), justNow }: FormatTimeOptions = {}): string => {
  const date = new Date(created);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const elapsed = now - date.getTime();
  if (elapsed < 0 || elapsed >= 2 * DAY_MS) {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  const format = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  // The raw elapsed, not rounded minutes: 30-59s rounds to one minute and would skip the label.
  if (elapsed < 60_000) {
    if (justNow) {
      return justNow;
    }
    // Seconds rather than `format(0, 'minute')`, which renders as "this minute".
    return format.format(-Math.max(1, Math.round(elapsed / 1000)), 'second');
  }

  const minutes = Math.round(elapsed / 60_000);
  if (minutes < 60) {
    return format.format(-minutes, 'minute');
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return format.format(-hours, 'hour');
  }

  // `numeric: 'auto'` renders -1 day as "yesterday".
  return format.format(-Math.round(hours / 24), 'day');
};
