//
// Copyright 2024 DXOS.org
//

import { type Scope, createContextScope } from '@radix-ui/react-context';
import { createMenuScope } from '@radix-ui/react-menu';
import { type RefObject } from 'react';

// Kept out of `DropdownMenu.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export const DROPDOWN_MENU_NAME = 'DropdownMenu';

export type DropdownMenuScopedProps<P> = P & { __scopeDropdownMenu?: Scope };
export const [createDropdownMenuContext, createDropdownMenuScope] = createContextScope(DROPDOWN_MENU_NAME, [
  createMenuScope,
]);
export const useMenuScope: (scope?: Scope) => any = createMenuScope();

export type DropdownMenuScope = Scope;

export const useDropdownMenuMenuScope: (scope?: DropdownMenuScope) => any = useMenuScope;

export type DropdownMenuContextValue = {
  triggerId: string;
  triggerRef: RefObject<HTMLButtonElement | null>;
  contentId: string;
  open: boolean;
  onOpenChange(open: boolean): void;
  onOpenToggle(): void;
  modal: boolean;
};

export const [DropdownMenuProvider, useDropdownMenuContext] =
  createDropdownMenuContext<DropdownMenuContextValue>(DROPDOWN_MENU_NAME);
