//
// Copyright 2026 DXOS.org
//

import React, { type CSSProperties, type ReactNode, useState } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { ResizeHandle, type Size, resizeAttributes, sizeStyle } from '@dxos/react-ui-dnd';
import { mx } from '@dxos/ui-theme';

//
// Splitter
//
// A presentational tile that lays out a main pane beside (or above) an optional companion pane with a
// draggable divider. The consumer controls the companion's open/close state via `open`; when closed the
// companion stays mounted (state preserved) but is hidden. The splitter owns the split extent
// (resizable, persisted via `onSizeChange`), bounded so neither pane drops below `minSize`. Free of
// app-framework concepts — panes are arbitrary nodes (typically `Plank`s).
//

// Companion extent (rem) and bounds.
const DEFAULT_SIZE = 24;
const MIN_SIZE = 20;
const MAX_SIZE = 60;

export type SplitterProps = ThemedClassName<{
  main: ReactNode;
  /** Companion pane; when omitted the main pane fills the tile. */
  companion?: ReactNode;
  /** Companion visibility; when false the companion stays mounted (state preserved) but hidden. */
  open?: boolean;
  /** Companion placement: to the right (horizontal) or below (vertical). */
  orientation?: 'horizontal' | 'vertical';
  /** Companion extent in rem (controlled); otherwise managed internally. */
  size?: Size;
  defaultSize?: Size;
  onSizeChange?: (size: Size) => void;
  /** Lower bound (rem) applied to both panes. */
  minSize?: number;
  maxSize?: number;
}>;

export const Splitter = ({
  main,
  companion,
  open = true,
  orientation = 'horizontal',
  size: sizeProp,
  defaultSize = DEFAULT_SIZE,
  onSizeChange,
  minSize = MIN_SIZE,
  maxSize = MAX_SIZE,
  classNames,
}: SplitterProps) => {
  const horizontal = orientation === 'horizontal';
  const [internalSize, setInternalSize] = useState<Size>(sizeProp ?? defaultSize);
  const size = sizeProp ?? internalSize;
  const setSize = (next: Size, commit?: boolean) => {
    setInternalSize(next);
    if (commit) {
      onSizeChange?.(next);
    }
  };

  // Bound the companion so neither pane drops below `minSize`: the companion is at least `minSize` and
  // at most the container minus `minSize` (leaving room for the main pane, which also carries the min).
  const companionStyle: CSSProperties = {
    ...sizeStyle(size, horizontal ? 'horizontal' : 'vertical'),
    ...(horizontal
      ? { minInlineSize: `${minSize}rem`, maxInlineSize: `calc(100% - ${minSize}rem)` }
      : { minBlockSize: `${minSize}rem`, maxBlockSize: `calc(100% - ${minSize}rem)` }),
  };
  const mainStyle: CSSProperties = horizontal ? { minInlineSize: `${minSize}rem` } : { minBlockSize: `${minSize}rem` };

  return (
    <div className={mx('flex h-full w-full', horizontal ? 'flex-row' : 'flex-col', classNames)}>
      <div className='flex-1 min-w-0 min-h-0' style={mainStyle}>
        {main}
      </div>
      {companion && (
        <div
          className={mx(
            'relative shrink-0 min-w-0 min-h-0 border-separator',
            horizontal ? 'border-s' : 'border-t',
            !open && 'hidden',
          )}
          {...resizeAttributes}
          style={companionStyle}
        >
          {open && (
            <ResizeHandle
              side={horizontal ? 'inline-start' : 'block-start'}
              size={size}
              onSizeChange={setSize}
              minSize={minSize}
              maxSize={maxSize}
              fallbackSize={DEFAULT_SIZE}
            />
          )}
          {companion}
        </div>
      )}
    </div>
  );
};
