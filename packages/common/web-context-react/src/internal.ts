//
// Copyright 2025 DXOS.org
//

import { createContext } from 'react';

/**
 * Internal React context for passing the host element to nested components.
 * This allows useWebComponentContext to dispatch events from the custom element.
 */
export const HostElementContext = createContext<HTMLElement | undefined>(undefined);
