//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { ProjectCapabilities } from '@dxos/plugin-projects/types';

import { crmProject } from '../templates/crm-project';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(ProjectCapabilities.Template, crmProject);
  }),
);
