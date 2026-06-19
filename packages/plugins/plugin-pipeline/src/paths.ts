//
// Copyright 2025 DXOS.org
//

import { Paths } from '@dxos/app-toolkit';
import { Pipeline } from '@dxos/types';

const { getSectionPath: getPipelinesPath, getObjectPath: getPipelinePath } = Paths.createTypeSectionPaths(
  Pipeline.Pipeline,
);

export { getPipelinesPath, getPipelinePath };
