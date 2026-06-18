//
// Copyright 2025 DXOS.org
//

import { Paths } from '@dxos/app-toolkit';

import { Sketch } from '#types';

const { getSectionPath: getSketchesPath, getObjectPath: getSketchPath } = Paths.createTypeSectionPaths(Sketch.Sketch);

export { getSketchesPath, getSketchPath };
