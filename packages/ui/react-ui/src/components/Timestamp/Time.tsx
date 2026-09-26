//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { TextTooltip, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { compactInterval, formatCompact } from '../../util/index.ts';

export type TimeProps = ThemedClassName<{
  /** The instant shown, as an ISO string or a Date. */
  date: string | Date;
  /**
   * The instant to measure against. Supplied by a story or a test so the counter does not move with
   * the wall clock; live otherwise, which is the point of the component.
   */
  now?: Date;
}>;

/**
 * A timestamp in the room a column has — `now`, `12m`, `90m`, `5h`, then `12 Sep` — with the full
 * instant in a tooltip.
 *
 * It counts live while it is counting: a row that says `1m` and still says `1m` ten minutes later is
 * worse than no counter, because the reader believes it. The tick is scheduled for the moment the
 * value changes rather than on a fixed interval — a minute counter wakes once a minute, an hour
 * counter once an hour, and a calendar date never wakes at all.
 *
 * Everything shown is lossy, which is why the tooltip carries the timestamp in full: the compact
 * form answers "recently?" and the tooltip answers "when exactly?".
 */
export const Time = ({ date, now, classNames }: TimeProps) => {
  // The tick's only job is to re-render; the value is derived, so nothing can drift out of step
  // with what is displayed.
  const [, setTick] = useState(0);
  const live = now === undefined;

  useEffect(() => {
    if (!live) {
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      const interval = compactInterval(date);
      if (interval === undefined) {
        return;
      }
      timer = setTimeout(() => {
        setTick((tick) => tick + 1);
        // Rescheduled from the new value, not repeated: the cadence changes as the timestamp ages,
        // and a minute counter that crossed into hours must stop waking every minute.
        schedule();
      }, interval);
    };

    schedule();
    return () => timer && clearTimeout(timer);
    // `tick` is deliberately absent: the effect reschedules itself, and listing it would tear the
    // chain down and rebuild it on every wake.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, live]);

  const parsed = typeof date === 'string' ? new Date(date) : date;
  const compact = formatCompact(date, { now });
  if (!compact) {
    return null;
  }

  // The full instant in the reader's own locale and zone: they are asking when this happened to
  // them, not for a value to cite.
  const full = parsed.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'medium' });

  return (
    <TextTooltip text={full}>
      {/* `time`, so the machine-readable instant travels with the text a reader sees. Tabular
          numerals, since a column of counters that reflows as digits change reads as movement. */}
      <time
        dateTime={parsed.toISOString()}
        data-testid='task.time'
        className={mx('whitespace-nowrap tabular-nums', classNames)}
      >
        {compact}
      </time>
    </TextTooltip>
  );
};

Time.displayName = 'Time';
