//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { ProjectCapabilities } from '#types';

import { WorldClockSpace } from '../samples/index.ts';
import { composerPluginVariant, makeComposerPlugin } from '../templates/index.ts';

// The World Clock space template builds with the same variant, so it is offered exactly where the project template is.
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* Capability.get(ClientCapabilities.Client);
    const variant = composerPluginVariant({ edgeUrl: client.config.values.runtime?.services?.edge?.url });
    return variant
      ? [
          Capability.contribute(ProjectCapabilities.Template, makeComposerPlugin(variant)),
          Capability.contribute(AppCapabilities.SpaceTemplate, WorldClockSpace.makeTemplate(variant)),
        ]
      : [];
  }),
);
