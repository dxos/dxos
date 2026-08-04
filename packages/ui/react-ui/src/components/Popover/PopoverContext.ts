//
// Copyright 2023 DXOS.org
//

import { type Scope, createContextScope } from '@radix-ui/react-context';
import { createPopperScope } from '@radix-ui/react-popper';
import { type RefObject } from 'react';

// Kept out of `Popover.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export type ScopedProps<P> = P & { __scopePopover?: Scope };

export const POPOVER_NAME = 'Popover';

export const [createPopoverContext, createPopoverScope] = createContextScope(POPOVER_NAME, [createPopperScope]);

export const usePopperScope = createPopperScope();

export type PopoverContextValue = {
  triggerRef: RefObject<HTMLButtonElement>;
  contentId: string;
  hasCustomAnchor: boolean;
  modal: boolean;
  open: boolean;
  onOpenChange(open: boolean): void;
  onOpenToggle(): void;
  onCustomAnchorAdd(): void;
  onCustomAnchorRemove(): void;
};

export const [PopoverProvider, usePopoverContext] = createPopoverContext<PopoverContextValue>(POPOVER_NAME);
