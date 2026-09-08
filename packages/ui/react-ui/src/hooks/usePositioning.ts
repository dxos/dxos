//
// Copyright 2026 DXOS.org
//

import { type PopoverRootProps } from '@ark-ui/react/popover';
import { type RefObject, useCallback, useMemo, useState } from 'react';

import { type CollisionPadding, useSafeCollisionPadding } from './useSafeCollisionPadding';

export type PositionSide = 'top' | 'right' | 'bottom' | 'left';
export type PositionAlign = 'start' | 'center' | 'end';

/** How floating content wants to be placed; the machine, which the root owns, does the placing. */
export type PlacementOptions = {
  side?: PositionSide;
  align?: PositionAlign;
  sideOffset?: number;
  alignOffset?: number;
  collisionPadding?: CollisionPadding;
  collisionBoundary?: Element | null | Array<Element | null>;
  avoidCollisions?: boolean;
  hideWhenDetached?: boolean;
};

/** The `positioning` every Zag floating machine takes; the popover's is the shared shape. */
export type Positioning = NonNullable<PopoverRootProps['positioning']>;

/** What a Zag machine accepts as the element its floating content is positioned against. */
export type AnchorElement = HTMLElement | { getBoundingClientRect: () => DOMRect; contextElement?: Element };

/**
 * Hands a virtual anchor to the machine as its anchor element rather than as a bare rect: the
 * element is what the machine's scroll and resize observers attach to, so the content follows the
 * anchor when an ancestor scrolls.
 */
export const toAnchorElement = (element: Element | null): AnchorElement | null => {
  if (element instanceof HTMLElement) {
    return element;
  }
  return element ? { getBoundingClientRect: () => element.getBoundingClientRect(), contextElement: element } : null;
};

export const toPlacement = (side: PositionSide = 'bottom', align: PositionAlign = 'center') =>
  align === 'center' ? side : (`${side}-${align}` as const);

/** Consumers hand the machine a per-side padding; it takes one number, so the widest side wins. */
export const toOverflowPadding = (padding: { top: number; right: number; bottom: number; left: number }) =>
  Math.max(padding.top, padding.right, padding.bottom, padding.left);

export type UsePositioningOptions = {
  open: boolean;
  /** The element the content is placed at and bounded by, unless a virtual anchor stands in. */
  triggerRef: RefObject<HTMLElement | null>;
  placement: PlacementOptions;
  defaultSide?: PositionSide;
  defaultAlign?: PositionAlign;
};

/**
 * Radix-shaped placement props as one Zag `positioning` object, plus a virtual anchor the machine
 * positions at, and observes, in place of its trigger. Shared by every floating root so the
 * collision, offset and anchor semantics are one implementation.
 */
export type UsePositioningResult = {
  positioning: Positioning;
  /** Registers the element the content is positioned at instead of the trigger; returns the unregister. */
  setVirtualAnchor: (ref: RefObject<Element | null>) => () => void;
};

export const usePositioning = ({
  open,
  triggerRef,
  placement: options,
  defaultSide = 'bottom',
  defaultAlign = 'center',
}: UsePositioningOptions): UsePositioningResult => {
  const [virtualAnchor, setVirtualAnchorState] = useState<RefObject<Element | null> | null>(null);
  const setVirtualAnchor = useCallback((ref: RefObject<Element | null>) => {
    setVirtualAnchorState(ref);
    return () => setVirtualAnchorState((current) => (current === ref ? null : current));
  }, []);

  const {
    side = defaultSide,
    align = defaultAlign,
    sideOffset = 0,
    alignOffset,
    collisionPadding = 8,
    collisionBoundary,
    avoidCollisions = true,
    hideWhenDetached,
  } = options;
  const safeCollisionPadding = useSafeCollisionPadding(collisionPadding);
  const overflowPadding = toOverflowPadding(safeCollisionPadding);

  // The closest annotated ancestor bounds the content.
  const boundary = useMemo(() => {
    const closest = triggerRef.current?.closest<HTMLElement>('[data-popover-collision-boundary]') ?? null;
    const given = Array.isArray(collisionBoundary) ? collisionBoundary : collisionBoundary ? [collisionBoundary] : [];
    const elements = [closest, ...given].filter((element): element is Element => !!element);
    return elements.length ? () => elements : undefined;
    // The trigger is read when the content opens, which is when the boundary matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, collisionBoundary]);

  const positioning = useMemo<Positioning>(
    () => ({
      strategy: 'fixed',
      placement: toPlacement(side, align),
      gutter: sideOffset,
      ...(alignOffset !== undefined && { offset: { mainAxis: sideOffset, crossAxis: alignOffset } }),
      overflowPadding,
      // Keeps the arrow off the rounded corners, where its fill would paint over the curve.
      arrowPadding: 12,
      flip: avoidCollisions,
      hideWhenDetached,
      boundary,
      ...(virtualAnchor && { getAnchorElement: () => toAnchorElement(virtualAnchor.current) }),
    }),
    [side, align, sideOffset, alignOffset, overflowPadding, avoidCollisions, hideWhenDetached, boundary, virtualAnchor],
  );

  return { positioning, setVirtualAnchor };
};
