//
// Copyright 2025 DXOS.org
//

import { createContext as createSolidContext, useContext } from 'solid-js';

/**
 * Internal SolidJS context for passing the host element to nested components.
 * This allows useWebComponentContext to dispatch events from the custom element.
 */
export const HostElementContext = createSolidContext<HTMLElement | undefined>();

/**
 * Get the host custom element from SolidJS context.
 * Used internally by useWebComponentContext when called from a custom element.
 */
export function getHostElement(): HTMLElement | undefined {
  return useContext(HostElementContext);
}
