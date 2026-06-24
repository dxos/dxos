//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, useState } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { ResizeHandle, type Size, resizeAttributes, sizeStyle } from '@dxos/react-ui-dnd';
import { mx } from '@dxos/ui-theme';

//
// Splitter
//
// A presentational tile that lays out a main pane beside (or above) an optional companion pane with a
// draggable divider. The companion is shown iff `companion` is provided, so the consumer controls the
// companion's open/close state; the splitter owns the split extent (resizable, persisted via
// `onSizeChange`). Free of app-framework concepts — panes are arbitrary nodes (typically `Plank`s).
//

// Companion extent (rem) and bounds.
const DEFAULT_SIZE = 24;
const MIN_SIZE = 20;
const MAX_SIZE = 60;

export type SplitterProps = ThemedClassName<{
  main: ReactNode;
  /** Companion pane; when omitted the main pane fills the tile (companion closed). */
  companion?: ReactNode;
  /** Companion placement: to the right (horizontal) or below (vertical). */
  orientation?: 'horizontal' | 'vertical';
  /** Companion extent in rem (controlled); otherwise managed internally. */
  size?: Size;
  defaultSize?: Size;
  onSizeChange?: (size: Size) => void;
  minSize?: number;
  maxSize?: number;
}>;

export const Splitter = ({
  main,
  companion,
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

  return (
    <div className={mx('flex h-full w-full', horizontal ? 'flex-row' : 'flex-col', classNames)}>
      <div className='flex-1 min-w-0 min-h-0'>{main}</div>
      {companion && (
        <div
          className='relative shrink-0 min-w-0 min-h-0 border-l border-separator'
          {...resizeAttributes}
          style={sizeStyle(size, horizontal ? 'horizontal' : 'vertical')}
        >
          <ResizeHandle
            side={horizontal ? 'inline-start' : 'block-start'}
            size={size}
            onSizeChange={setSize}
            minSize={minSize}
            maxSize={maxSize}
            fallbackSize={DEFAULT_SIZE}
          />
          {companion}
        </div>
      )}
    </div>
  );
};
