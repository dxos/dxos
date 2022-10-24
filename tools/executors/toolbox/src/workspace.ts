//
// Copyright 2022 DXOS.org
//

import type { WorkspaceJsonConfiguration, ProjectConfiguration } from '@nrwl/devkit';
import path from 'path';

import { loadJson } from './util';

/**
 * Cached workspace projects.
 */
export class Workspace {
  private readonly _projectByPackage = new Map<string, [string, ProjectConfiguration]>();

  constructor (
    public readonly root: string,
    public readonly workspace: WorkspaceJsonConfiguration
  ) {
    Object.entries(workspace.projects).forEach(([name, project]) => {
      const packagePath = path.join(root, project.root!, 'package.json');
      const packageJson = loadJson(packagePath);
      this._projectByPackage.set(packageJson.name, [name, project]);
    });
  }

  getProject (packageName: string) {
    return this._projectByPackage.get(packageName)?.[1];
  }
}
