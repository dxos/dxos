//
// Copyright 2024 DXOS.org
//

import type { ProtocolWithReturn } from 'webext-bridge';

declare module 'webext-bridge' {
  export interface ProtocolMap {
    'config': ProtocolWithReturn<{ debug?: boolean }, { debug: boolean }>;
    'ping': ProtocolWithReturn<{ debug?: boolean }, string>;
    'start-picker': ProtocolWithReturn<Record<string, never>, { picked: boolean }>;
    'open-composer': ProtocolWithReturn<Record<string, never>, void>;
  }
}

// `@types/chrome` (pinned to 0.0.125) predates the side panel API, so declare
// the minimal surface the extension uses. `declare global` is required because
// this file is a module (it imports), which would otherwise scope the namespace.
declare global {
  namespace chrome {
    const sidePanel: {
      setPanelBehavior(behavior: { openPanelOnActionClick?: boolean }): Promise<void>;
      open(options: { tabId?: number; windowId?: number }): Promise<void>;
    };
  }
}
