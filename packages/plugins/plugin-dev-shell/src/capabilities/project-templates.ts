//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';

import { composerPlugin } from '../templates/composer-plugin.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return composerPlugin ? [Capability.contribute(ProjectCapabilities.Template, composerPlugin)] : [];
  }),
);
