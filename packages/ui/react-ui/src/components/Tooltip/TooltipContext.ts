//
// Copyright 2025 DXOS.org
//

import { type Scope, createContextScope } from '@radix-ui/react-context';
import { createPopperScope } from '@radix-ui/react-popper';
import { type ReactNode, type RefObject } from 'react';

import { type TooltipSide, type TooltipTriggerElement } from './Tooltip';

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

export type TooltipContextValue = {
  contentId: string;
  open: boolean;
  stateAttribute: 'closed' | 'delayed-open' | 'instant-open';
  trigger: TooltipTriggerElement | null;
  onTriggerChange(trigger: TooltipTriggerElement | null, content?: ReactNode, side?: TooltipSide): void;
  /** `delayDuration` overrides the provider's for this trigger (see `TooltipTrigger`). */
  onTriggerEnter(delayDuration?: number): void;
  onTriggerLeave(): void;
  onOpen(): void;
  onClose(): void;
  onPointerInTransitChange(inTransit: boolean): void;
  isPointerInTransitRef: RefObject<boolean>;
  disableHoverableContent: boolean;
};

export const [TooltipContextProvider, useTooltipContext] = createTooltipContext<TooltipContextValue>(TOOLTIP_NAME);
