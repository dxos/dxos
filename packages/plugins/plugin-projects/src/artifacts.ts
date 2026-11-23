//
// Copyright 2026 DXOS.org
//

import * as ContainerModel from '@dxos/app-toolkit/ContainerModel';
import * as Project from '@dxos/compute/Project';

import { ProjectsNamespace } from './namespace.ts';

/** The objects a project contains as its artifacts. */
export const artifacts = (project: Project.Project): ContainerModel.Container =>
  ContainerModel.make(project, 'artifacts', {
    removeLabel: ['remove-from-project.label', { ns: ProjectsNamespace.key }],
  });
