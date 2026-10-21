//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';

import { INTROSPECT_MCP_ENDPOINT, INTROSPECT_PROVIDER_ID } from '../constants.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(ConnectorSpec.Connector, [
      {
        id: INTROSPECT_PROVIDER_ID,
        source: new URL(INTROSPECT_MCP_ENDPOINT.url).host,
        label: 'DXOS Introspect',
        kind: 'app',
        noCredential: true,
        mcp: () => INTROSPECT_MCP_ENDPOINT,
      },
    ]);
  }),
);
