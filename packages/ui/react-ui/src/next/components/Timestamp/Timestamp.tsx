//
// Copyright 2026 DXOS.org
//

import React, { type ComponentPropsWithoutRef, forwardRef, useEffect, useId, useState } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { type DateLike, compactInterval, formatCompact, toDate } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';
import { Tooltip } from '../Tooltip/index.ts';

export type TimestampProps = ThemedClassName<Omit<ComponentPropsWithoutRef<'time'>, 'children' | 'dateTime'>> & {
  /** The instant shown, as an ISO string, a Unix timestamp in milliseconds, or a Date. */
  date: DateLike;
  /** The instant to measure against, so a story or test does not move with the wall clock; live otherwise. */
  now?: Date;
};

/**
 * A `<time>` as compact as a column allows (`now`, `12m`, `90m`, `5h`, then `12 Sep`), with the full instant in a
 * Tooltip, since the compact form is lossy. It counts live, waking only when the text would change: a minute counter
 * once a minute, an hour counter once an hour, a calendar date never.
 */
export const Timestamp = forwardRef<HTMLTimeElement, TimestampProps>(
  ({ classNames, date, now, id: idProp, ...props }, forwardedRef) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;

    // The tick only re-renders; the text is derived, so it cannot drift from what is shown.
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

        // Rescheduled from the new value, since the cadence slows as the timestamp ages.
        timer = setTimeout(() => {
          setTick((tick) => tick + 1);
          schedule();
        }, interval);
      };

      schedule();
      return () => clearTimeout(timer);
    }, [date, live]);

    const compact = formatCompact(date, { now });
    if (!compact) {
      return null;
    }

    // The reader's own locale and zone: they are asking when this happened to them.
    const parsed = toDate(date);
    const full = parsed.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'medium' });
    return (
      // The trigger's id locates the tooltip's anchor, since the `<time>`'s own `data-scope` wins the merge.
      <Tooltip.Root ids={{ trigger: id }}>
        <Tooltip.Trigger asChild>
          <time
            {...props}
            id={id}
            dateTime={parsed.toISOString()}
            data-scope='timestamp'
            data-part='root'
            className={mx(recipes.timestamp(), classNames)}
            ref={forwardedRef}
          >
            {compact}
          </time>
        </Tooltip.Trigger>
        <Tooltip.Content>{full}</Tooltip.Content>
      </Tooltip.Root>
    );
  },
);

Timestamp.displayName = 'Next.Timestamp';
