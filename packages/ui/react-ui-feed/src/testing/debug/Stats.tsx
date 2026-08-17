//
// Copyright 2026 DXOS.org
//

import React, { Fragment } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

export type Stat = {
  id: string;
  label: string;
  unit?: string;
  /** Emphasis for a value that means something is wrong; called with the current value. */
  classNames?: (value: number) => string | false | undefined;
};

export type StatsProps = ThemedClassName<{
  stats: Stat[];
  values: Record<string, number>;
  /** Readouts side by side, for a panel that is wider than it is tall. @default 1 */
  columns?: number;
}>;

/**
 * A block of readouts, in fixed tracks.
 *
 * Every number here changes while the feed scrolls, so the columns are sized by the grid rather than
 * by their contents: cells that resize to fit shuffle the whole block on each update, and an
 * instrument that moves cannot be read at a glance.
 */
export const Stats = ({ stats, values, columns = 1, classNames }: StatsProps) => (
  <div
    className={mx('grid gap-x-2 tabular-nums whitespace-nowrap', classNames)}
    style={{ gridTemplateColumns: `repeat(${columns}, auto 1fr auto)` }}
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
export const warnAbove = (value: number) => value > 0 && 'text-warning-text';
