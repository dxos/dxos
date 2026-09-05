//
// Copyright 2025 DXOS.org
//

import { type UseTooltipReturn } from '@ark-ui/react/tooltip';
import { type ReactNode, type RefObject } from 'react';

import { createContext } from '@dxos/react-hooks';

// Kept out of `Tooltip.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export const DEFAULT_DELAY_DURATION = 700;
export const TOOLTIP_NAME = 'Tooltip';

export type TooltipSide = 'top' | 'right' | 'bottom' | 'left';

export type TooltipStateAttribute = 'closed' | 'delayed-open' | 'instant-open';

/** What a trigger shows when it is the active one. */
export type TooltipEntry = {
  content: ReactNode;
  side?: TooltipSide;
};

/**
 * Stable for the life of the provider, so that the triggers consuming it — every one in the app,
 * since a single provider serves them all — do not re-render as the pointer moves.
 */
export type TooltipContextValue = {
  /** The machine api as of the provider's last render; read at event time, never subscribed to. */
  apiRef: RefObject<UseTooltipReturn | null>;
  /** The content element's id, for `aria-describedby`. */
  contentId: string;
  /** Registers what a trigger shows; returns the unregister. */
  register(value: string, entry: TooltipEntry): () => void;
  onOpen(): void;
  onClose(): void;
};

export const [TooltipContextProvider, useTooltipContext] = createContext<TooltipContextValue>(TOOLTIP_NAME);
