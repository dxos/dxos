//
// Copyright 2026 DXOS.org
//

import { type Popover as PopoverPrimitive } from '@ark-ui/react/popover';
import React, { type ReactElement, type ReactNode } from 'react';

import { mx } from '@dxos/ui-theme';

import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { ScrollArea } from './ScrollArea.tsx';

type Positioning = NonNullable<PopoverPrimitive.RootProps['positioning']>;

/**
 * zag's per-placement update functions (one each time a popup opens) that have run once; the first runs synchronously
 * so the popup opens in place and focus and dismissal wire up as before.
 */
const placed = new WeakSet<() => Promise<void>>();

/**
 * Defers a popup's later position updates to an animation frame (DESIGN.md follow-up 53). floating-ui repositions from
 * its ResizeObserver on the trigger and applies `--reference-width` before that callback's frame ends, so a popup
 * widening with its trigger resized the (shallower) ScrollArea viewport mid-delivery and the thumbs' observation of it
 * was skipped: "ResizeObserver loop completed with undelivered notifications". A frame requested from a scroll event
 * still runs in that frame, so only a resize-driven update lands a frame later.
 */
const deferPosition: Positioning['updatePosition'] = ({ updatePosition }) => {
  if (!placed.has(updatePosition)) {
    placed.add(updatePosition);
    return updatePosition();
  }

  return new Promise<void>((resolve, reject) => requestAnimationFrame(() => updatePosition().then(resolve, reject)));
};

/** A portalled popup's positioning: `gutter` px from its trigger, updated outside ResizeObserver callbacks. */
export const popupPositioning = (gutter: number, positioning?: Positioning): Positioning => ({
  gutter,
  updatePosition: deferPosition,
  ...positioning,
});

export type PopupScrollProps = {
  size?: Size;
  classNames?: string;
  /** The Ark Content, which becomes the scrolling viewport: zag scrolls its highlighted item into view only there. */
  children: ReactElement;
  /** Parts drawn outside the viewport (an arrow), which its overflow would otherwise clip. */
  outside?: ReactNode;
};

/**
 * The frame of a scrolling popup (Menu, Select, Combobox; DESIGN.md follow-up 49): a thin overlay ScrollArea that is
 * also the popup surface, sized and levelled like any `.nx-popup`, with the portalled Content as its viewport.
 */
export const PopupScroll = ({ size, classNames, children, outside }: PopupScrollProps) => (
  <ScrollArea.Root data-surface='popup' size={size} width='thin' classNames={mx(recipes.popup(), classNames)}>
    <ScrollArea.Viewport asChild>{children}</ScrollArea.Viewport>
    {outside}
  </ScrollArea.Root>
);
