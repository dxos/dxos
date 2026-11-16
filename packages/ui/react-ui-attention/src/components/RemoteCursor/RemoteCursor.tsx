//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

export type RemoteCursorProps = ThemedClassName<{
  /** Collaborator's display name, shown in the tag. */
  name: string;
  /** Member hue (a palette name such as `red`), matching their presence avatar. */
  hue: string;
  /** Tip position in the positioned parent's pixels. */
  x: number;
  y: number;
  /** Divides the cursor's size, for a parent drawn under a zoom that the cursor should not follow. */
  zoom?: number;
}>;

// The hue lands in a CSS variable name, and it arrives from other peers.
const safeHue = (hue: string) => (/^[a-z]+$/.test(hue) ? hue : 'neutral');

/**
 * Another collaborator's pointer: an arrow and a name tag in their member hue.
 */
export const RemoteCursor = ({ classNames, name, hue, x, y, zoom = 1 }: RemoteCursorProps) => {
  const color = safeHue(hue);
  return (
    <div
      role='none'
      className={mx('absolute top-0 left-0 pointer-events-none origin-top-left', classNames)}
      style={{ transform: `translate(${x}px, ${y}px) scale(${1 / zoom})` }}
      data-testid='remote-cursor'
      data-hue={color}
    >
      <svg width='16' height='16' viewBox='0 0 16 16' aria-hidden className='block drop-shadow-sm'>
        <path
          d='M1 1 L1 13 L4.5 9.75 L7 15 L9 14 L6.75 8.75 L11.5 8.5 Z'
          style={{ fill: `var(--color-${color}-bg)` }}
          stroke='white'
          strokeWidth='1'
          strokeLinejoin='round'
        />
      </svg>
      <span
        className='absolute top-[14px] left-[10px] px-1.5 py-0.5 rounded-sm text-xs leading-none whitespace-nowrap shadow-sm'
        style={{ backgroundColor: `var(--color-${color}-surface)`, color: `var(--color-${color}-fg)` }}
      >
        {name}
      </span>
    </div>
  );
};
