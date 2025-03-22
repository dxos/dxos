//
// Copyright 2024 DXOS.org
//

import type { ProtocolWithReturn } from 'webext-bridge';

declare module 'webext-bridge' {
  export interface ProtocolMap {
    config: ProtocolWithReturn<{ debug?: boolean }, { debug: boolean }>;
    ping: ProtocolWithReturn<{ debug?: boolean }, string>;
  }
}
