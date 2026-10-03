//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { ProjectCapabilities } from '#types';

import { composerPlugin } from '../templates/index.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* Capability.get(ClientCapabilities.Client);
    const template = composerPlugin({ edgeUrl: client.config.values.runtime?.services?.edge?.url });
    return template ? Capability.contributeAll(ProjectCapabilities.Template, [template]) : [];
  }),
);
