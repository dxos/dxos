//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Tour from '@dxos/app-toolkit/Tour';
import * as Project from '@dxos/compute/Project';

import { ProjectsNamespace } from '../namespace.ts';
import { steps } from '../tours/index.ts';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(AppCapabilities.Tour, {
      id: `${ProjectsNamespace.key}.tour.project`,
      label: ['project-tour.label', { ns: ProjectsNamespace.key }],
      matches: Tour.whenType(Project.Project),
      auto: true,
      steps,
    }),
  ),
);
