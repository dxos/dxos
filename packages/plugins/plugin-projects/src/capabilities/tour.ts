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

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const manager = yield* Capability.Service;
    const isProject = Tour.whenType(Project.Project);
    return Capability.contribute(AppCapabilities.Tour, {
      id: `${ProjectsNamespace.key}.tour.project`,
      label: ['project-tour.label', { ns: ProjectsNamespace.key }],
      // Its steps point at the controls that edit and delegate, which a read-only host leaves out.
      matches: (data) => manager.getAll(AppCapabilities.ReadOnly).length === 0 && isProject(data),
      auto: true,
      steps,
    });
  }),
);
