//
// Copyright 2022 DXOS.org
//

import fs from 'fs';
import minimatch, { Minimatch } from 'minimatch';
import path from 'path';

import { log } from '@dxos/log';

import { type PackageJson, type Project, type WorkspaceJson } from '../types';
import { array } from '../util';

type WorkspaceProcessorOptions = {
  verbose?: boolean;
  include?: string;
};

/**
 * Process packages in workspace.
 *
 * @deprecated Nx deprecated the workspace.json file.
 */
export class WorkspaceProcessor {
  private readonly _projectsByName = new Map<string, Project>();
  private readonly _projectsByPackage = new Map<string, Project>();

  // prettier-ignore
  constructor(
    private readonly _baseDir: string,
    private readonly _options: WorkspaceProcessorOptions = {},
  ) {}

  get baseDir() {
    return this._baseDir;
  }

  getProjects(filter?: string): Project[] {
    const projects = array(this._projectsByPackage);
    if (!filter) {
      return projects;
    }

    const match = new Minimatch(filter, {});
    return projects.filter((project) => {
      return match.match(project.subDir);
    });
  }

  getProjectByName(name: string): Project | undefined {
    return this._projectsByName.get(name);
  }

  getProjectByPackage(packageName: string): Project | undefined {
    return this._projectsByPackage.get(packageName);
  }

  init() {
    // Parse Nx workspace.
    const { projects } = this.readJson<WorkspaceJson>('workspace.json');

    // Parse project definitions.
    for (const name of Object.keys(projects)) {
      const subdir = projects[name];
      const packageJson = this.readJson<PackageJson>(path.join(subdir, 'package.json'));
      const project: Project = {
        name,
        subDir: subdir,
        package: packageJson,
        dependencies: new Set<Project>(),
        descendents: new Set<string>(),
        cycles: [],
      };

      this._projectsByName.set(name, project);
      this._projectsByPackage.set(packageJson.name, project);
    }

    // Process all projects.
    const visited = new Set<string>();
    for (const project of array(this._projectsByName)) {
      this.processProject(project, visited);
    }

    return this;
  }

  /**
   * Recursively process the project.
   * @return Array of descendents.
   */
  private processProject(project: Project, visited: Set<string>, chain: string[] = [project.package.name]): void {
    const {
      package: { dependencies: dependencyMap = {} },
    } = project;
    if (this._options.verbose) {
      log.info('Processing:', project.package.name);
    }

    // Check if already processed (since depth first).
    if (!visited.has(project.package.name)) {
      visited.add(project.package.name);

      // TODO(burdon): Extra validations?
      if (dependencyMap[project.package.name]) {
        log.warn(`Invalid dependency on itself: ${project.package.name}`);
      }

      // TODO(burdon): Support filtering outside of workspace (e.g., crypto) without recursion.
      const dependencies: Project[] = Object.keys(dependencyMap)
        .filter(minimatch.filter(this._options.include ?? '*'))
        .map((dep) => this._projectsByPackage.get(dep))
        .filter(Boolean) as Project[]; // Ignore @dxos packages outside of monorepo.

      dependencies.forEach((dep) => {
        project.dependencies.add(dep);
        project.descendents.add(dep.package.name);

        const nextChain = [...chain, dep.package.name];
        if (chain.includes(dep.package.name)) {
          project.cycles.push(nextChain);
          log.warn(`Cycle detected: [${nextChain.join(' => ')}]`);
        } else {
          this.processProject(dep, visited, nextChain);
          array(dep.descendents).forEach((packageName) => project.descendents.add(packageName));
        }
      });
    }
  }

  private readJson<T>(filepath: string): T {
    return JSON.parse(fs.readFileSync(path.join(this._baseDir, filepath), { encoding: 'utf-8' }));
  }
}
