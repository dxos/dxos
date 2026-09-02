//
// Copyright 2026 DXOS.org
//

import { type ItemMode } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import React from 'react';

import { DROP_INDENTATION } from './helpers.ts';

export type TreeDropDebugProps = {
  mode: ItemMode;
  level: number;
  /** Whether the row offers a `make-child` band — a branch, or a leaf in a tree that allows it. */
  acceptsChildren: boolean;
  draggable: boolean;
};

/**
 * Paints a row's drop bands so they can be seen without holding a drag.
 *
 * The bands mirror the tree-item hitbox: the outer quarters reorder, the middle half nests, and a
 * last-in-group row splits its bottom band by indent into `reparent` levels — the zone that carries
 * an item out of a subtree, and the one that is impossible to find by trial when it is only a few
 * pixels wide. `expanded` has no lower band at all, because "below an open branch" and "its first
 * child" are the same place.
 */
export const TreeDropDebug = ({ mode, level, acceptsChildren, draggable }: TreeDropDebugProps) => {
  if (!draggable) {
    return null;
  }

  const reparents = mode === 'last-in-group' ? level - 1 : 0;

  return (
    <div className='pointer-events-none dx-fullscreen z-20 font-mono text-[8px] leading-none'>
      <div className='absolute inset-x-0 top-0 h-1/4 border-t border-sky-400/70 bg-sky-400/15'>
        <span className='absolute left-1 top-0 text-sky-300'>above</span>
      </div>
      {acceptsChildren && (
        <div className='absolute inset-x-0 top-1/4 h-1/2 border border-emerald-400/60 bg-emerald-400/10'>
          <span className='absolute left-1 top-0 text-emerald-300'>child</span>
        </div>
      )}
      {mode !== 'expanded' && (
        <div className='absolute inset-x-0 bottom-0 h-1/4 border-b border-sky-400/70 bg-sky-400/15'>
          <span className='absolute bottom-0 left-1 text-sky-300'>below</span>
        </div>
      )}
      {/* One band per ancestor the row can be lifted out to, widest (shallowest) first. */}
      {Array.from({ length: reparents }, (_, index) => (
        <div
          key={index}
          className='absolute bottom-0 h-1/4 border-b border-amber-400/80 bg-amber-400/25'
          style={{ left: index * DROP_INDENTATION, width: DROP_INDENTATION }}
        >
          <span className='absolute bottom-0 left-0.5 text-amber-200'>{`^${index + 1}`}</span>
        </div>
      ))}
    </div>
  );
};

TreeDropDebug.displayName = 'Tree.DropDebug';
