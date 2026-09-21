//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import * as Routine from '@dxos/compute/Routine';
import { Repo } from '@dxos/types';

export const Schema = AppCapability.schema([Project.Project, Instructions.Instructions, Routine.Routine, Repo.Repo]);
