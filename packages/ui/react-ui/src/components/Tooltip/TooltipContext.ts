//
// Copyright 2025 DXOS.org
//

import { type Scope, createContextScope } from '@radix-ui/react-context';
import { createPopperScope } from '@radix-ui/react-popper';
import { type ReactNode, type RefObject } from 'react';

import { type TooltipSide, type TooltipTriggerElement } from './Tooltip.tsx';

// Kept out of `Tooltip.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export type TooltipScopedProps<P = {}> = P & { __scopeTooltip?: Scope };
export const [createTooltipContext, createTooltipScope] = createContextScope('Tooltip', [createPopperScope]);
export const usePopperScope = createPopperScope();

//
// Tooltip
//

export const DEFAULT_DELAY_DURATION = 700;
export const TOOLTIP_OPEN = 'tooltip.open';
export const TOOLTIP_NAME = 'Tooltip';

export type TooltipStateAttribute = 'closed' | 'delayed-open' | 'instant-open';

/**
 * The half of the tooltip context that never changes identity, so that the triggers consuming it — every
 * one in the app, since a single provider serves them all — do not re-render on each pointer-enter.
 */
export type TooltipContextValue = {
  contentId: string;
  /** Open state as a ref, so a trigger's event handlers can read it without subscribing to it. */
  isOpenRef: RefObject<boolean>;
  onTriggerChange(trigger: TooltipTriggerElement | null, content?: ReactNode, side?: TooltipSide): void;
  onTriggerEnter(): void;
  onTriggerLeave(): void;
  onOpen(): void;
  onClose(): void;
  onPointerInTransitChange(inTransit: boolean): void;
  isPointerInTransitRef: RefObject<boolean>;
  disableHoverableContent: boolean;
};

/** The half that changes as the pointer moves, consumed only by the single content the provider renders. */
export type TooltipVolatileContextValue = {
  open: boolean;
  stateAttribute: TooltipStateAttribute;
  trigger: TooltipTriggerElement | null;
};

export const [TooltipContextProvider, useTooltipContext] = createTooltipContext<TooltipContextValue>(TOOLTIP_NAME);

export const [TooltipVolatileContextProvider, useTooltipVolatileContext] =
  createTooltipContext<TooltipVolatileContextValue>(TOOLTIP_NAME);
