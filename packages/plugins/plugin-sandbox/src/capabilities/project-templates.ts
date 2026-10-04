//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';

import { makeComposerPluginTemplate } from '../templates/composer-plugin.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const config = yield* Capability.get(ClientCapabilities.Config);
    // A build without git (a tarball, a CI checkout without history) has no hash; main is then the
    // closest published `@dxos/*` to what it runs.
    const ref = config.values.runtime?.app?.build?.commitHash ?? 'main';
    return [Capability.contribute(ProjectCapabilities.Template, makeComposerPluginTemplate({ ref }))];
  }),
);
