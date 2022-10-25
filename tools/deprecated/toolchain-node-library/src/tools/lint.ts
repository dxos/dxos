//
// Copyright 2021 DXOS.org
//

import { Project } from '../project';
import { execTool } from './common';

export const execLint = async (
  project: Project,
  additionalArgs: string[] = []
) => {
  await execTool('eslint', ['.', '-f', 'visualstudio', ...additionalArgs]);
};
