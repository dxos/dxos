//
// Copyright 2021 DXOS.org
//

import { Project } from '../project';
import { execCommand } from './common';

export const execScript = async (project: Project, script: string, args: string[]) => {
  if (!project.packageJsonContents.scripts?.[script]) {
    throw new Error(`Script '${script}' not found in package.json`);
  }

  await execCommand(project.packageJsonContents.scripts?.[script], args.map(String));
};
