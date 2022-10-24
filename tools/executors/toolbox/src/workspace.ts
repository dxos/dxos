//
// Copyright 2022 DXOS.org
//

import type { WorkspaceJsonConfiguration, ProjectConfiguration } from '@nrwl/devkit';
import assert from 'assert';
import path from 'path';

import { loadJson } from './util';

export type ProjectVisitor = (name: string, packageName: string, project: ProjectConfiguration) => void | Promise<void>

/**
 * Cached workspace projects.
 */
export class Workspace {
  private readonly _projectsByPackage = new Map<string, [string, ProjectConfiguration]>();
  private readonly _packageNamesByProject = new Map<string, string>();

  constructor (
    public readonly root: string,
    public readonly workspace: WorkspaceJsonConfiguration
  ) {
    Object.entries(workspace.projects).forEach(([name, project]) => {
      const packagePath = path.join(root, project.root!, 'package.json');
      const packageJson = loadJson(packagePath);
      this._projectsByPackage.set(packageJson.name, [name, project]);
      this._packageNamesByProject.set(name, packageJson.name);
    });
  }

  getProject (packageName: string): ProjectConfiguration {
    const [, project] = this._projectsByPackage.get(packageName) ?? [];
    assert(project, `Invalid package: ${packageName}`);
    return project;
  }

  getPackage (packageName: string): any {
    const [, project] = this._projectsByPackage.get(packageName) ?? [];
    assert(project && project.root, `Invalid package: ${packageName}`);
    return loadJson(path.join(this.root, project.root, 'package.json'));
  }

  async visitProjects (cb: ProjectVisitor) {
    // TODO(burdon): Config sort order.
    const keys = Array.from(this._projectsByPackage.keys()).sort();
    await Promise.all(keys.map(async (packageName) => {
      const [name, project] = this._projectsByPackage.get(packageName) ?? [];
      assert(name && project);
      await cb(packageName, name, project);
    }));
  }
}
