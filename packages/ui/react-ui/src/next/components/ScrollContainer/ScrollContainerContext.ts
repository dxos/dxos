//
// Copyright 2026 DXOS.org
//

import { createContext } from '@dxos/react-hooks';

// Kept out of `ScrollContainer.tsx`: react-refresh only fast-refreshes a module whose exports are all components.

/** Imperative handle on a `ScrollContainer.Root`. */
export type ScrollController = {
  readonly viewport: HTMLElement | null;
  scrollToTop: (behavior?: ScrollBehavior) => void;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
};

export type ScrollContainerContextValue = {
  controller: ScrollController;
  /** Following the tail: new content scrolls into view. */
  pinned: boolean;
  /** Scrolled away from the top, so the Fade shows. */
  overflow: boolean;
  /** Called by Viewport to register its scrolling element. */
  setViewport: (viewport: HTMLElement | null) => void;
  setPinned: (pinned: boolean) => void;
  setOverflow: (overflow: boolean) => void;
};

export const [ScrollContainerProvider, useScrollContainerContext] =
  createContext<ScrollContainerContextValue>('Next.ScrollContainer');
