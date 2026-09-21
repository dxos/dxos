//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';
import * as ProjectsEvents from '@dxos/plugin-projects/ProjectsEvents';

import { mailboxFacts } from '../templates/mailbox-facts.ts';

export const ProjectTemplates = Capability.makeModule(
  'ProjectTemplates',
  { provides: [ProjectCapabilities.Template], activatesOn: ProjectsEvents.Start },
  Effect.fnUntraced(function* () {
    return [Capability.contribute(ProjectCapabilities.Template, mailboxFacts)];
  }),
);
