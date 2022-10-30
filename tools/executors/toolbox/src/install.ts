//
// Copyright 2022 DXOS.org
//

import fs from 'fs';
import path from 'path';

import { loadJson } from './util';

/**
 * Add executor to each project configuration.
 */
const install = async () => {
  const root = path.join(__dirname, '../../../..');
  const workspace = loadJson(path.join(root, 'workspace.json'));
  Object.values(workspace.projects).forEach((baseDir) => {
    const filename = path.join(root, baseDir as string, 'project.json');
    const projectJson = loadJson(filename);
    if (projectJson) {
      projectJson.targets.toolbox = {
        executor: '@dxos/toolbox:exec'
      };

      fs.writeFileSync(filename, JSON.stringify(projectJson, undefined, 2), 'utf-8');
      console.log(`Updated: ${filename}`);
    }
  });
};

void install();
