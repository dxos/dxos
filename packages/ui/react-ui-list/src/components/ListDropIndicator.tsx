//
// Copyright 2024 DXOS.org
//

import { type Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/types';
import React, { type CSSProperties, type HTMLAttributes } from 'react';

// Tailwind port of `@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box`. The atlaskit
// React component `require`s a `.compiled.css` file, which crashes the node test loader (and
// thus every node-tested plugin that transitively imports this list); this port is CSS-free
// and theme-aware (`bg-accent-bg`). `react-ui-mosaic` keeps the atlaskit component. See
// `react-ui-list/AUDIT.md` D4.

type Orientation = 'horizontal' | 'vertical';

const edgeToOrientationMap: Record<Edge, Orientation> = {
  top: 'horizontal',
  bottom: 'horizontal',
  left: 'vertical',
  right: 'vertical',
};

const orientationStyles: Record<Orientation, HTMLAttributes<HTMLElement>['className']> = {
  horizontal:
    'h-(--line-thickness) left-[calc(var(--line-inset)+var(--terminal-radius))] right-(--line-inset) before:left-(--terminal-inset)',
  vertical:
    'w-(--line-thickness) top-[calc(var(--line-inset)+var(--terminal-radius))] bottom-(--line-inset) before:top-(--terminal-inset)',
};

const edgeStyles: Record<Edge, HTMLAttributes<HTMLElement>['className']> = {
  top: 'top-(--line-offset) before:top-(--offset-terminal)',
  right: 'right-(--line-offset) before:right-(--offset-terminal)',
  bottom: 'bottom-(--line-offset) before:bottom-(--offset-terminal)',
  left: 'left-(--line-offset) before:left-(--offset-terminal)',
};

const strokeSize = 2;
const terminalSize = 8;
const offsetToAlignTerminalWithLine = (strokeSize - terminalSize) / 2;

/** Props for {@link ListDropIndicator}. */
export type ListDropIndicatorProps = {
  edge: Edge;
  gap?: number;
  terminalInset?: number;
  lineInset?: number;
};

/** Themed box-edge drop indicator (line + circular terminal) for pragmatic-dnd reorder. */
export const ListDropIndicator = ({
  edge,
  gap = 0,
  lineInset = 0,
  terminalInset = lineInset - terminalSize,
}: ListDropIndicatorProps) => {
  const orientation = edgeToOrientationMap[edge];

  return (
    <div
      style={
        {
          '--line-thickness': `${strokeSize}px`,
          '--line-offset': `calc(-0.5 * (${gap}px + ${strokeSize}px))`,
          '--line-inset': `${lineInset}px`,
          '--terminal-size': `${terminalSize}px`,
          '--terminal-radius': `${terminalSize / 2}px`,
          '--terminal-inset': `${terminalInset}px`,
          '--offset-terminal': `${offsetToAlignTerminalWithLine}px`,
        } as CSSProperties
      }
      className={`absolute z-10 pointer-events-none bg-accent-bg before:content-[''] before:w-(--terminal-size) before:h-(--terminal-size) box-border before:box-border before:absolute before:border-[length:--line-thickness] before:border-solid before:border-accent-bg before:rounded-full ${orientationStyles[orientation]} ${edgeStyles[edge]}`}
    />
  );
};
