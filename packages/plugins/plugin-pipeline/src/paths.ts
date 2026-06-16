//
// Copyright 2025 DXOS.org
//

import { createTypeSectionPaths } from '@dxos/app-toolkit';
import { Pipeline } from '@dxos/types';

const { getSectionPath: getPipelinesPath, getObjectPath: getPipelinePath } = createTypeSectionPaths(Pipeline.Pipeline);

export { getPipelinesPath, getPipelinePath };
