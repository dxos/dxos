//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as Templates from '@dxos/plugin-projects/Templates';

import { ShogiSpace, WorldClockSpace } from '../samples/index.ts';

/**
 * Offered only where the plugins they plan can be built and published: a build that stamped the commit its packages
 * are published at, talking to an EDGE to publish to.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* Capability.get(ClientCapabilities.Client);
    const edgeUrl = client.config.values.runtime?.services?.edge?.url;
    const toolchain = Templates.readToolchain();
    if (!toolchain || !edgeUrl) {
      return [];
    }

    return [
      Capability.contributeAll(AppCapabilities.SpaceTemplate, [
        ShogiSpace.makeTemplate({ toolchain, edgeUrl }),
        WorldClockSpace.makeTemplate({ toolchain, edgeUrl }),
      ]),
    ];
  }),
);
