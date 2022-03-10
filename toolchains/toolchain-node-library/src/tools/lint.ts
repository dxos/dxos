//
// Copyright 2021 DXOS.org
//

import { Project } from '../project';
import { execTool } from './common';

export async function execLint (project: Project, additionalArgs: string[] = []) {
  await execTool('eslint', ['.', ...additionalArgs]);
}
