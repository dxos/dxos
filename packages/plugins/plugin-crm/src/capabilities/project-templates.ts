//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { ProjectCapabilities } from '@dxos/plugin-projects/types';

import { crmPipeline } from '../templates/crm-pipeline';
import { crmProject } from '../templates/crm-project';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributes(ProjectCapabilities.Template, crmProject),
      Capability.contributes(ProjectCapabilities.Template, crmPipeline),
    ];
  }),
);
