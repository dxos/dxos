//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';

import { type ScrollController } from './ScrollContainer.tsx';

// Kept out of `ScrollContainer.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export type ScrollContainerContextValue = {
  controller?: ScrollController;
  pinned?: boolean;
  overflow?: boolean;
  /** Called by Viewport to register/unregister the scroll element. */
  setViewport: (el: HTMLDivElement | null) => void;
  /** Called by Viewport on wheel events to update pinned state. */
  setPinned: (value: boolean) => void;
  /** Called by Viewport on scroll events to update overflow state. */
  setOverflow: (value: boolean) => void;
};

export const [ScrollContainerProvider, useScrollContainerContext] =
  createContext<ScrollContainerContextValue>('ScrollContainer');
