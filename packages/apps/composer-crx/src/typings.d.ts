//
// Copyright 2024 DXOS.org
//

import type { ProtocolWithReturn } from 'webext-bridge';

// Minimal ambient declaration for chrome.scripting.executeScript — not included in
// webextension-polyfill types or the installed @types/chrome version.
declare global {
  namespace chrome {
    namespace scripting {
      interface InjectionTarget {
        tabId: number;
      }
      interface ScriptInjection {
        target: InjectionTarget;
        files?: string[];
        func?: (...args: unknown[]) => unknown;
        args?: unknown[];
      }
      function executeScript(injection: ScriptInjection): Promise<unknown[]>;
    }
  }
}

declare module 'webext-bridge' {
  export interface ProtocolMap {
    config: ProtocolWithReturn<{ debug?: boolean }, { debug: boolean }>;
    ping: ProtocolWithReturn<{ debug?: boolean }, string>;
    'start-picker': ProtocolWithReturn<Record<string, never>, { picked: boolean }>;
    'open-composer': ProtocolWithReturn<Record<string, never>, void>;
  }
}
