//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Button, Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

/**
 * Spine width in px. The deck's stacking geometry reserves exactly this much per pinned plank, so the
 * `w-11` below and this constant must agree — hence both living here.
 */
export const SPINE_PX = 44;

export type FoldSpineProps = ThemedClassName<{
  /** Mirrors the plank heading's sigil, so the icon does not move as the plank folds. */
  icon: string;
  label: string;
  onClick: () => void;
}>;

/**
 * A folded plank's book-spine sigil: icon plus vertical title, crossfading in as the plank collapses
 * (the enclosing tile toggles `data-folded`) and returning the plank to view on click. It sits at the
 * plank's leading edge — the sliver that stays visible in either pile.
 *
 * The `dx-fold-spine` class is a documented hook for stories to retime or restyle the transition
 * (see `Deck.stories.tsx`); keep it on the root.
 */
export const FoldSpine = ({ icon, label, onClick, classNames }: FoldSpineProps) => (
  <Button
    variant='ghost'
    onClick={onClick}
    aria-label={label}
    // `.dx-button` supplies `justify-center`, which in this column would centre the sigil vertically
    // instead of aligning it with the plank heading, and `px-3`/`rounded-xs`/`font-medium`, which the
    // utilities layer overrides here to keep the spine's own geometry and label weight.
    classNames={mx(
      'dx-fold-spine absolute inset-y-0 left-0 z-[1] flex w-11 flex-col items-center justify-start gap-0 rounded-none p-0',
      'border-ie border-separator bg-base-surface',
      'opacity-0 pointer-events-none transition-opacity duration-200 ease-out',
      'group-data-[folded]/tile:pointer-events-auto group-data-[folded]/tile:opacity-100',
      classNames,
    )}
  >
    {/* Icon box matches the plank toolbar height so the sigil stays put as the plank folds. */}
    <div className='flex h-(--dx-rail-content) shrink-0 items-center justify-center'>
      <Icon icon={icon} size={5} classNames='shrink-0 text-subdued' />
    </div>
    {/* TODO(wittjosiah): Plain span — no react-ui primitive renders a vertical (writing-mode) label. */}
    <span className='truncate text-sm font-normal text-description [writing-mode:vertical-rl] rotate-180'>{label}</span>
  </Button>
);

FoldSpine.displayName = 'FoldSpine';
