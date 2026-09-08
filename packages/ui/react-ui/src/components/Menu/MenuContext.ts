//
// Copyright 2025 DXOS.org
//

import { type MenuRootProps as MenuPrimitiveRootProps } from '@ark-ui/react/menu';
import { type RefObject } from 'react';

import { createContext } from '@dxos/react-hooks';

import { type PlacementOptions, type PositionAlign, type PositionSide } from '../../hooks';

// Kept out of `Menu.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export const MENU_NAME = 'Menu';

export type MenuSide = PositionSide;
export type MenuAlign = PositionAlign;

type DismissHandler<K extends keyof MenuPrimitiveRootProps> = NonNullable<MenuPrimitiveRootProps[K]>;

export type MenuInteractOutsideEvent = Parameters<DismissHandler<'onInteractOutside'>>[0];
export type MenuPointerDownOutsideEvent = Parameters<DismissHandler<'onPointerDownOutside'>>[0];
export type MenuFocusOutsideEvent = Parameters<DismissHandler<'onFocusOutside'>>[0];
export type MenuEscapeKeyDownEvent = Parameters<DismissHandler<'onEscapeKeyDown'>>[0];

export type MenuPlacementOptions = PlacementOptions;

/** Dismissal hooks the content declares; read by the root at event time. */
export type MenuContentHandlers = {
  onCloseAutoFocus?: (event: Event) => void;
  onInteractOutside?: (event: MenuInteractOutsideEvent) => void;
  onPointerDownOutside?: (event: MenuPointerDownOutsideEvent) => void;
  onFocusOutside?: (event: MenuFocusOutsideEvent) => void;
  onEscapeKeyDown?: (event: MenuEscapeKeyDownEvent) => void;
};

/** The item's `onSelect`: a cancelable event, `preventDefault()` keeps the menu open. */
export type MenuSelectHandler = (event: Event) => void;

export type MenuContextValue = {
  open: boolean;
  onOpenChange(open: boolean): void;
  triggerRef: RefObject<HTMLElement | null>;
  setVirtualAnchor(ref: RefObject<Element | null>): () => void;
  setPlacement(options: MenuPlacementOptions): void;
  /** A context trigger announces itself so the root places content beside the pointer, not below a button. */
  markContextTrigger(): () => void;
  handlersRef: RefObject<MenuContentHandlers>;
};

export const [MenuProvider, useMenuContext] = createContext<MenuContextValue>(MENU_NAME);
