//
// Copyright 2025 DXOS.org
//

import { type PopoverRootProps as PopoverPrimitiveRootProps } from '@ark-ui/react/popover';
import { type RefObject } from 'react';

import { createContext } from '@dxos/react-hooks';

import { type PlacementOptions, type PositionAlign, type PositionSide } from '../../hooks/index.ts';

// Kept out of `Popover.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export const POPOVER_NAME = 'Popover';

export type PopoverSide = PositionSide;
export type PopoverAlign = PositionAlign;

type DismissHandler<K extends keyof PopoverPrimitiveRootProps> = NonNullable<PopoverPrimitiveRootProps[K]>;

export type PopoverInteractOutsideEvent = Parameters<DismissHandler<'onInteractOutside'>>[0];
export type PopoverPointerDownOutsideEvent = Parameters<DismissHandler<'onPointerDownOutside'>>[0];
export type PopoverFocusOutsideEvent = Parameters<DismissHandler<'onFocusOutside'>>[0];
export type PopoverEscapeKeyDownEvent = Parameters<DismissHandler<'onEscapeKeyDown'>>[0];

export type PopoverPlacementOptions = PlacementOptions;

/** Focus and dismissal hooks the content declares; read by the root at event time. */
export type PopoverContentHandlers = {
  onOpenAutoFocus?: (event: Event) => void;
  onCloseAutoFocus?: (event: Event) => void;
  onInteractOutside?: (event: PopoverInteractOutsideEvent) => void;
  onPointerDownOutside?: (event: PopoverPointerDownOutsideEvent) => void;
  onFocusOutside?: (event: PopoverFocusOutsideEvent) => void;
  onEscapeKeyDown?: (event: PopoverEscapeKeyDownEvent) => void;
};

export type PopoverContextValue = {
  contentId: string;
  open: boolean;
  modal: boolean;
  onOpenChange(open: boolean): void;
  triggerRef: RefObject<HTMLElement | null>;
  /** Registers an element the content is positioned at instead of the trigger; returns the unregister. */
  setVirtualAnchor(ref: RefObject<Element | null>): () => void;
  setPlacement(options: PopoverPlacementOptions): void;
  handlersRef: RefObject<PopoverContentHandlers>;
};

export const [PopoverProvider, usePopoverContext] = createContext<PopoverContextValue>(POPOVER_NAME);
