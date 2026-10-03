//
// Copyright 2026 DXOS.org
//

import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import * as Routine from '@dxos/compute/Routine';
import { Repo } from '@dxos/types';

/**
 * Schemas this plugin registers, loaded on demand: the capability activates at idle,
 * so naming them here keeps them out of the plugin body's module graph. `Repo` comes with
 * `Project`: a project holds a ref to one, and a space that can read the project has to be able to
 * resolve what it points at.
 */
export default [Project.Project, Instructions.Instructions, Routine.Routine, Repo.Repo];
