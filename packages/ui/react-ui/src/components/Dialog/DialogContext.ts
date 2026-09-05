//
// Copyright 2025 DXOS.org
//

import { type DialogRootProps as DialogPrimitiveRootProps } from '@ark-ui/react/dialog';
import { type RefObject } from 'react';

import { createContext } from '@dxos/react-hooks';

// Kept out of `Dialog.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export const DIALOG_NAME = 'Dialog';

type DismissHandler<K extends keyof DialogPrimitiveRootProps> = NonNullable<DialogPrimitiveRootProps[K]>;

export type DialogInteractOutsideEvent = Parameters<DismissHandler<'onInteractOutside'>>[0];
export type DialogPointerDownOutsideEvent = Parameters<DismissHandler<'onPointerDownOutside'>>[0];
export type DialogFocusOutsideEvent = Parameters<DismissHandler<'onFocusOutside'>>[0];
export type DialogEscapeKeyDownEvent = Parameters<DismissHandler<'onEscapeKeyDown'>>[0];

/** Focus and dismissal hooks the content declares; read by the root, which owns the machine. */
export type DialogContentHandlers = {
  onOpenAutoFocus?: (event: Event) => void;
  onCloseAutoFocus?: (event: Event) => void;
  onInteractOutside?: (event: DialogInteractOutsideEvent) => void;
  onPointerDownOutside?: (event: DialogPointerDownOutsideEvent) => void;
  onFocusOutside?: (event: DialogFocusOutsideEvent) => void;
  onEscapeKeyDown?: (event: DialogEscapeKeyDownEvent) => void;
};

export type DialogContextValue = {
  open: boolean;
  modal: boolean;
  onOpenChange(open: boolean): void;
  contentRef: RefObject<HTMLDivElement | null>;
  handlersRef: RefObject<DialogContentHandlers>;
};

export const [DialogProvider, useDialogContext] = createContext<DialogContextValue>(DIALOG_NAME);

type OverlayLayoutContextValue = { inOverlayLayout?: boolean };

export const [OverlayLayoutProvider, useOverlayLayoutContext] = createContext<OverlayLayoutContextValue>(
  `${DIALOG_NAME}.Overlay`,
  {},
);
