//
// Copyright 2026 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import React from 'react';

import { mx } from '@dxos/ui-theme';

import { composableProps, slottable } from '../../util/slots.ts';
import { type Align, type Gap, alignClasses, gapClasses } from '../layout.ts';

/** A fixed track size, passed through as written. */
export type GridLength =
  | `${number}${'rem' | 'em' | 'px' | 'ch' | '%' | 'vw' | 'vh'}`
  | `var(--${string})`
  | `calc(${string})`
  | `minmax(${string})`;

/**
 * One track: `fill` takes the remaining space and may shrink below its content (`minmax(0, 1fr)`), a number is a
 * share of it (`minmax(0, <n>fr)`), `min`/`max`/`auto` size to the content, and a length is fixed.
 */
export type GridTrack = 'fill' | 'min' | 'max' | 'auto' | number | GridLength;

/** Track definition: a count of equal `fill` tracks, a list of tracks, or `subgrid` to adopt the parent grid's. */
export type GridTracks = number | 'subgrid' | readonly GridTrack[];

export type GridProps = {
  cols?: GridTracks;
  rows?: GridTracks;
  gap?: Gap;
  align?: Align;
  /** Center children on both axes (`place-items-center`). */
  center?: boolean;
  /** Fill and clip the parent (`dx-expand`); off by default, as `Flex`'s is, so a grid sizes to its content. */
  grow?: boolean;
  /**
   * Collapse the wrapper to `display: contents`, so children join the parent grid directly. For a
   * wrapper that exists only conditionally — an unconditional pass-through wants `asChild`.
   */
  contents?: boolean;
};

/**
 * CSS grid container.
 *
 * `cols`/`rows` take a count for equal tracks, or a list of tokens for anything asymmetric: `cols={['fill', 'min']}` is
 * `grid-cols-[1fr_min-content]`, with the flexible track allowed to shrink so long content truncates rather than
 * widening the grid. The tokens are typed, so a misspelt track is a compile error rather than an invalid template.
 *
 * `subgrid` adopts the parent's tracks and spans them (`grid-column: 1 / -1`), which is the only
 * way it is ever useful; the parent must actually define those tracks. Check `Column.Row` and
 * `Card.Row` first — both already are 3-track subgrid rows.
 *
 * `gap` is restricted to the named steps of the theme spacing ramp (see {@link Gap}). As with
 * `Flex`, padding, sizing, and colour go through `classNames` rather than growing props here.
 *
 * @example
 * ```tsx
 * <Grid cols={3} gap='sm'>…</Grid>
 * <Grid cols={['fill', 'auto']} gap='md' align='center'>…</Grid>
 * <Grid cols={['18rem', 'fill']}>…</Grid>
 * <Grid cols='subgrid' gap='sm' align='center'>…</Grid>
 * ```
 */
export const Grid = slottable<HTMLDivElement, GridProps>(
  (
    { children, asChild, style, role, cols, rows, gap, align, center, grow = false, contents, ...props },
    forwardedRef,
  ) => {
    const { className, ...rest } = composableProps<HTMLDivElement>(props);

    return (
      <ark.div
        asChild={asChild}
        ref={forwardedRef}
        {...rest}
        role={role ?? 'none'}
        className={
          contents
            ? mx('contents', className)
            : mx(
                'grid',
                // `dx-expand` already clips; a non-growing grid must not, or converting a plain
                // wrapper would silently start cutting off overflow (focus rings, popovers).
                grow && 'dx-expand',
                cols === 'subgrid' && 'col-span-full',
                rows === 'subgrid' && 'row-span-full',
                gap && gapClasses[gap],
                center && 'place-items-center',
                align && alignClasses[align],
                className,
              )
        }
        style={
          contents
            ? style
            : {
                gridTemplateColumns: cols !== undefined ? trackList(cols) : undefined,
                gridTemplateRows: rows !== undefined ? trackList(rows) : undefined,
                ...style,
              }
        }
      >
        {children}
      </ark.div>
    );
  },
);

const TRACK_SIZES: Record<'fill' | 'min' | 'max' | 'auto', string> = {
  fill: 'minmax(0, 1fr)',
  min: 'min-content',
  max: 'max-content',
  auto: 'auto',
};

const trackSize = (track: GridTrack): string =>
  typeof track === 'number'
    ? `minmax(0, ${track}fr)`
    : track === 'fill' || track === 'min' || track === 'max' || track === 'auto'
      ? TRACK_SIZES[track]
      : track;

const trackList = (tracks: GridTracks): string =>
  typeof tracks === 'number'
    ? `repeat(${tracks}, minmax(0, 1fr))`
    : tracks === 'subgrid'
      ? 'subgrid'
      : tracks.map(trackSize).join(' ');
