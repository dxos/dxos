//
// Copyright 2024 DXOS.org
//

import { type Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/types';
import React, { type CSSProperties, type HTMLAttributes } from 'react';

type Orientation = 'horizontal' | 'vertical';

const edgeToOrientationMap: Record<Edge, Orientation> = {
  top: 'horizontal',
  bottom: 'horizontal',
  left: 'vertical',
  right: 'vertical',
};

const orientationStyles: Record<Orientation, HTMLAttributes<HTMLElement>['className']> = {
  horizontal:
    'h-[--line-thickness] left-[calc(var(--line-inset)+var(--terminal-radius))] right-[--line-inset] before:left-[--terminal-inset]',
  vertical:
    'is-[--line-thickness] top-[calc(var(--line-inset)+var(--terminal-radius))] bottom-[--line-inset] before:top-[--terminal-inset]',
};

const edgeStyles: Record<Edge, HTMLAttributes<HTMLElement>['className']> = {
  top: 'top-[--line-offset] before:top-[--offset-terminal]',
  right: 'right-[--line-offset] before:right-[--offset-terminal]',
  bottom: 'bottom-[--line-offset] before:bottom-[--offset-terminal]',
  left: 'left-[--line-offset] before:left-[--offset-terminal]',
};

const strokeSize = 2;
const terminalSize = 8;
const offsetToAlignTerminalWithLine = (strokeSize - terminalSize) / 2;

export type DropIndicatorProps = {
  edge: Edge;
  gap?: number;
  terminalInset?: number;
  lineInset?: number;
};

/**
 * This is a tailwind port of `@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box`
 */
export const ListDropIndicator = ({
  edge,
  gap = 0,
  lineInset = 0,
  terminalInset = lineInset - terminalSize,
}: DropIndicatorProps) => {
  const orientation = edgeToOrientationMap[edge];

  return (
    <div
      role='none'
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
      className={`absolute z-10 pointer-events-none bg-accentSurface before:content-[''] before:w-[--terminal-size] before:h-[--terminal-size] box-border before:absolute before:border-[length:--line-thickness] before:border-solid before:border-accentSurface before:rounded-full ${orientationStyles[orientation]} ${edgeStyles[edge]}`}
    />
  );
};
