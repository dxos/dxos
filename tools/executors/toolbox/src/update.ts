//
// Copyright 2022 DXOS.org
//

import fs from 'fs';
import path from 'path';

import { loadJson } from './util';

/**
 * Add executor to each project configuration.
 */
const update = async () => {
  const root = path.join(__dirname, '../../../..');
  const workspace = await loadJson<any>(path.join(root, 'workspace.json'));

  await Promise.all(
    Object.values(workspace.projects).map(async (baseDir) => {
      const filename = path.join(root, baseDir as string, 'project.json');
      const projectJson = await loadJson<any>(filename);
      if (projectJson) {
        projectJson.targets.toolbox = {
          executor: '@dxos/toolbox:exec'
        };

        fs.writeFileSync(filename, JSON.stringify(projectJson, undefined, 2), 'utf-8');
        console.log(`Updated: ${filename}`);
      }
    })
  );
};

void update();
