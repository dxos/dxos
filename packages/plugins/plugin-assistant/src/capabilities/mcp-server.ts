//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { BROWSER_MCP_ENDPOINT, BROWSER_MCP_KEY } from '../constants.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(AppCapabilities.McpServer, {
      key: BROWSER_MCP_KEY,
      name: 'Browser',
      mcp: BROWSER_MCP_ENDPOINT,
    });
  }),
);
