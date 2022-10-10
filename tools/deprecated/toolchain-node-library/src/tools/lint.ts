//
// Copyright 2021 DXOS.org
//

import { Project } from '../project.js';
import { execTool } from './common.js';

export const execLint = async (project: Project, additionalArgs: string[] = []) => {
  await execTool('eslint', ['.', '-f', 'visualstudio', ...additionalArgs]);
};
