//
// Copyright 2022 DXOS.org
//

import path from 'path';

import { loadJson } from './util';

/**
 * Add executor to each project configuration.
 */
// TODO(burdon): Warn of comments.
const install = async () => {
  const root = path.join(__dirname, '../../../..');
  const workspace = loadJson(path.join(root, 'workspace.json'));
  Object.values(workspace.projects).forEach(baseDir => {
    const filename = path.join(root, baseDir as string, 'project.json');
    const projectJson = loadJson(filename);
    if (projectJson) {
      projectJson.targets.toolbox = {
        executor: '@dxos/toolbox:exec'
      };
      console.log(projectJson);
    }
  });
};

void install();
