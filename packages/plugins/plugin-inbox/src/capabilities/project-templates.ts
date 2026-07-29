//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { ProjectCapabilities } from '@dxos/plugin-projects/types';

import { inboxResearch } from '../templates';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [Capability.contributes(ProjectCapabilities.Template, inboxResearch)];
  }),
);
