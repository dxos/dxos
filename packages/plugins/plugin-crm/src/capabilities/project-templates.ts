//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';
import * as ProjectsEvents from '@dxos/plugin-projects/ProjectsEvents';

import { crmPipeline } from '../templates/crm-pipeline.ts';
import { crmProject } from '../templates/crm-project.ts';

export const ProjectTemplates = Capability.makeModule(
  'ProjectTemplates',
  { provides: [ProjectCapabilities.Template], activatesOn: ProjectsEvents.Start },
  Effect.fnUntraced(function* () {
    return Capability.contributeAll(ProjectCapabilities.Template, [crmProject, crmPipeline]);
  }),
);
