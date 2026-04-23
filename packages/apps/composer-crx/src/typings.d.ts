//
// Copyright 2024 DXOS.org
//

import type { ProtocolWithReturn } from 'webext-bridge';

import type { DeliverResult } from './bridge/sender';
import type { Clip, ClipAck } from './clip/types';

declare module 'webext-bridge' {
  export interface ProtocolMap {
    config: ProtocolWithReturn<{ debug?: boolean }, { debug: boolean }>;
    ping: ProtocolWithReturn<{ debug?: boolean }, string>;
    'start-picker': ProtocolWithReturn<Record<string, never>, { clip: Clip | null }>;
    'open-composer': ProtocolWithReturn<Record<string, never>, void>;
  }
}

// Re-export for compilation convenience.
export type { Clip, ClipAck, DeliverResult };
