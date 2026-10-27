//
// Copyright 2026 DXOS.org
//

import React, { type ComponentPropsWithoutRef, forwardRef, useContext, useEffect, useId, useState } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { TranslationsContext } from '../../providers/ThemeProvider/TranslationsContext.ts';
import { recipes } from '../../recipes.ts';
import {
  type DateLike,
  type FormatRelativeOptions,
  compactInterval,
  formatCompact,
  formatRelative,
  relativeInterval,
  toDate,
} from '../../util/format-time.ts';
import * as Tooltip from '../Tooltip/Tooltip.tsx';

/**
 * Re-renders when `interval` says the text derived from `date` next changes, so a live label wakes only when it would
 * read differently: a minute counter once a minute, an hour counter once an hour, a calendar date never. Inert when
 * `live` is false (a story or test pinning `now`).
 */
const useTick = (date: DateLike, interval: (date: DateLike) => number | undefined, live: boolean) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!live) {
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      const delay = interval(date);
      if (delay === undefined) {
        return;
      }

      // Rescheduled from the new value, since the cadence slows as the timestamp ages.
      timer = setTimeout(() => {
        setTick((tick) => tick + 1);
        schedule();
      }, delay);
    };

    schedule();
    return () => clearTimeout(timer);
  }, [date, interval, live]);
};

/**
 * {@link formatRelative} kept current: `5 minutes ago` becomes `6 minutes ago` without the caller re-rendering. For
 * text composed into a larger string; a standalone label is a {@link Timestamp} with `variant='relative'`.
 */
export const useRelativeTime = (
  date: DateLike | undefined,
  { now, justNow, locale }: FormatRelativeOptions = {},
): string => {
  const appLocale = useAppLocale();
  useTick(date ?? Number.NaN, relativeInterval, date !== undefined && now === undefined);
  return date === undefined ? '' : formatRelative(date, { now, justNow, locale: locale ?? appLocale });
};

/** The app's locale, so a label matches the language of the translated text around it. */
const useAppLocale = (): string | undefined => useContext(TranslationsContext).dtLocale.code;

export type TimestampProps = ThemedClassName<Omit<ComponentPropsWithoutRef<'time'>, 'children' | 'dateTime'>> & {
  /** The instant shown, as an ISO string, a Unix timestamp in milliseconds, or a Date. */
  date: DateLike;
  /** The instant to measure against, so a story or test does not move with the wall clock; live otherwise. */
  now?: Date;
  /**
   * `compact` (default) fits a column: `now`, `12m`, `5h`, then `12 Sep`. `relative` reads as prose: `5 minutes ago`,
   * `yesterday`, then `12 Sep`.
   */
  variant?: 'compact' | 'relative';
  /** Text for the first minute in the `relative` variant, translated by the caller. */
  justNow?: string;
};

/**
 * A `<time>` in the app's one form for "when" (see {@link TimestampProps.variant}), with the full instant in a
 * Tooltip, since the short form is lossy. It counts live, waking only when the text would change.
 */
export const Timestamp = forwardRef<HTMLTimeElement, TimestampProps>(
  ({ classNames, date, now, variant = 'compact', justNow, id: idProp, ...props }, forwardedRef) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;
    const relative = variant === 'relative';
    const locale = useAppLocale();
    useTick(date, relative ? relativeInterval : compactInterval, now === undefined);

    const text = relative ? formatRelative(date, { now, justNow, locale }) : formatCompact(date, { now });
    if (!text) {
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
            {text}
          </time>
        </Tooltip.Trigger>
        <Tooltip.Content>{full}</Tooltip.Content>
      </Tooltip.Root>
    );
  },
);

Timestamp.displayName = 'Timestamp';

export * from '../../util/format-time.ts';
