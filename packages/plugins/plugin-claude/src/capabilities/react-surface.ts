//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as ProjectSurface from '@dxos/plugin-projects/ProjectSurface';

import { ProjectFolder } from '../containers/index.ts';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'projectFolder',
        // The component renders nothing where no agent host exists, which the filter cannot see.
        filter: Surface.makeFilter(ProjectSurface.Settings),
        component: ProjectFolder,
        props: ({ data: { project } }) => ({ project }),
      }),
    ]),
  ),
);
