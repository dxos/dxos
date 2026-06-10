//
// Copyright 2025 DXOS.org
//

import { createTypeSectionPaths } from '@dxos/app-toolkit';

import { Sketch } from '#types';

const { getSectionPath: getSketchesPath, getObjectPath: getSketchPath } = createTypeSectionPaths(Sketch.Sketch);

export { getSketchesPath, getSketchPath };
