//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { ProjectCapabilities } from '#types';
import { ProjectsEvents } from '#types';

import { defaultTemplates } from '../templates/index.ts';

export const Templates = Capability.makeModule(
  'Templates',
  {
    provides: [ProjectCapabilities.Template],
    activatesOn: ProjectsEvents.Start,
  },
  Effect.fnUntraced(function* () {
    return Capability.contributeAll(ProjectCapabilities.Template, defaultTemplates);
  }),
);
