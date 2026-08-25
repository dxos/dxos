//
// Copyright 2026 DXOS.org
//

import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import * as Routine from '@dxos/compute/Routine';

/**
 * Schemas this plugin registers, loaded on demand: the capability activates at idle,
 * so naming them here keeps them out of the plugin body's module graph.
 *
 * Wider than the browser list, which registers `Project` alone: a headless host has no guarantee
 * that the routine plugin is enabled, and a project scaffolds owned instructions and routines.
 */
export default [Project.Project, Instructions.Instructions, Routine.Routine];
