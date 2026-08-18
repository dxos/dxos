//
// Copyright 2026 DXOS.org
//

import React, { Fragment } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

/** Readouts are mostly counts, but a range (`463–499`) is one reading and reads as one cell. */
export type StatValue = number | string;

export type Stat = {
  id: string;
  label?: string;
  unit?: string;
  /** Emphasis for a value that means something is wrong; called with the current value. */
  classNames?: (value: StatValue) => string | false | undefined;
};

export type StatsProps = ThemedClassName<{
  'stats': Stat[];
  'values': Record<string, StatValue>;
  /** Readouts side by side, for a panel that is wider than it is tall. @default 1 */
  'columns'?: number;
  'title'?: string;
  'data-testid'?: string;
}>;

/**
 * A block of readouts, in fixed tracks.
 *
 * Every number here changes while the feed scrolls, so the value and unit columns are given widths
 * rather than sized to their contents: a column that fits itself to `4` and then to `1054` moves
 * every digit beside it, and an instrument that moves cannot be read at a glance.
 */
export const Stats = ({ stats, values, columns = 1, classNames, title, ...props }: StatsProps) => (
  <div
    {...props}
    title={title}
    className={mx('grid gap-x-1 tabular-nums whitespace-nowrap', classNames)}
    style={{ gridTemplateColumns: `repeat(${columns}, 1fr 5rem 1.5rem)` }}
  >
    {stats.map(({ id, label, unit, classNames }) => (
      <Fragment key={id}>
        <span className='text-subdued'>{label}</span>
        <span className={mx('text-right', classNames?.(values[id]))} data-testid={`feed.${id}`}>
          {values[id]}
        </span>
        <span className='text-subdued'>{unit ?? ''}</span>
      </Fragment>
    ))}
  </div>
);

/** Anything above zero is a defect, not a reading. */
export const warnAbove = (value: StatValue) => Number(value) > 0 && 'text-warning-text';
