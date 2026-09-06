//
// Copyright 2026 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import React from 'react';

import { mx } from '@dxos/ui-theme';

import { composableProps, slottable } from '../../util';
import { type Align, type Gap, alignClasses, gapClasses } from '../layout';

/** A single track: a CSS track size, or a number read as `<n>fr`. */
export type GridTrack = string | number;

/**
 * Track definition: a count (equal `1fr` tracks), an explicit list, or `subgrid` to adopt the
 * parent grid's tracks.
 */
export type GridTracks = number | 'subgrid' | readonly GridTrack[];

export type GridProps = {
  cols?: GridTracks;
  rows?: GridTracks;
  gap?: Gap;
  align?: Align;
  /** Center children on both axes (`place-items-center`). */
  center?: boolean;
  /** Fill and clip the parent (`dx-expand`). */
  grow?: boolean;
  /**
   * Collapse the wrapper to `display: contents`, so children join the parent grid directly. For a
   * wrapper that exists only conditionally — an unconditional pass-through wants `asChild`.
   */
  contents?: boolean;
};

const trackList = (tracks: GridTracks): string =>
  typeof tracks === 'number'
    ? `repeat(${tracks}, 1fr)`
    : tracks === 'subgrid'
      ? 'subgrid'
      : tracks.map((track) => (typeof track === 'number' ? `${track}fr` : track)).join(' ');

/**
 * CSS grid container.
 *
 * `cols`/`rows` take a count for equal tracks, or a list for anything asymmetric — the list form is
 * the point, since `cols={['min-content', '1fr']}` reads where `grid-cols-[min-content_1fr]` does
 * not. `1fr` in the count form keeps each track's min-content floor; pass `'minmax(0, 1fr)'`
 * explicitly for a track that must be allowed to shrink below its content.
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
 * <Grid cols={['min-content', '1fr']} gap='md' align='center'>…</Grid>
 * <Grid cols='subgrid' gap='sm' align='center'>…</Grid>
 * ```
 */
export const Grid = slottable<HTMLDivElement, GridProps>(
  (
    { children, asChild, style, role, cols, rows, gap, align, center, grow = true, contents, ...props },
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
