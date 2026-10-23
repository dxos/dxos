//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { INTROSPECT_MCP_ENDPOINT, INTROSPECT_MCP_KEY } from '../constants.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(AppCapabilities.McpServer, {
      key: INTROSPECT_MCP_KEY,
      name: 'DXOS Introspect',
      mcp: INTROSPECT_MCP_ENDPOINT,
    });
  }),
);
