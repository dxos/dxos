//
// Copyright 2022 DXOS.org
//

import fs from 'fs';
import minimatch from 'minimatch';
import path from 'path';
import { array } from './util';

import { PackageJson, Project, WorkspaceJson } from './types';

// TODO(burdon): Move to types.
export interface ProjectMap {
  readonly baseDir: string
  getProject (packageName: string): Project | undefined
}

type ProjectProcessorOptions = {
  verbose?: boolean
  include?: string
}

/**
 * Process packages in workspace.
 */
export class ProjectProcessor implements ProjectMap {
  public readonly projectsByName = new Map<string, Project>();
  public readonly projectsByPackage = new Map<string, Project>();

  constructor (
    readonly baseDir: string,
    readonly options: ProjectProcessorOptions = {}
  ) {}

  get projects (): Project[] {
    return array(this.projectsByPackage);
  }

  getProject (packageName: string): Project | undefined {
    return this.projectsByPackage.get(packageName);
  }

  match (filter?: string): Project[] {
    return filter ? this.projects.filter(p => minimatch(p.name, filter)) : this.projects;
  }

  init () {
    const { projects } = this.readJson<WorkspaceJson>('workspace.json');

    // Read project definitions.
    for (const name of Object.keys(projects)) {
      const subdir = projects[name];
      const packageJson = this.readJson<PackageJson>(path.join(subdir, 'package.json'));
      const project: Project = {
        name,
        subdir,
        package: packageJson,
        dependencies: new Set<Project>(),
        descendents: new Set<string>(),
        cycles: []
      };

      this.projectsByName.set(name, project);
      this.projectsByPackage.set(packageJson.name, project);
    }

    // Process all projects.
    const visited = new Set<string>();
    for (const project of array(this.projectsByName)) {
      this.processProject(project, visited);
    }

    return this;
  }

  /**
   * Recursively process the project.
   * @return Array of descendents.
   */
  private processProject (project: Project, visited: Set<string>, chain: string[] = [project.package.name]): void {
    const { package: { dependencies: dependencyMap = {} } } = project;
    if (this.options.verbose) {
      console.log('Processing:', project.package.name);
    }

    // Check if already processed (since depth first).
    if (!visited.has(project.package.name)) {
      visited.add(project.package.name);

      // TODO(burdon): Extra validations?
      if (dependencyMap[project.package.name]) {
        console.warn(`Invalid dependency on itself: ${project.package.name}`);
      }

      // TODO(burdon): Support filtering outside of workspace (e.g., crypto) without recursion.
      const dependencies: Project[] = Object.keys(dependencyMap)
        .filter(minimatch.filter(this.options.include ?? '*'))
        .map(dep => this.projectsByPackage.get(dep))
        .filter(Boolean) as Project[]; // Ignore @dxos packages outside of monorepo.

      dependencies.forEach(dep => {
        project.dependencies.add(dep);
        project.descendents.add(dep.package.name);

        const nextChain = [...chain, dep.package.name];
        if (chain.includes(dep.package.name)) {
          project.cycles.push(nextChain);
          console.warn(`Cycle detected: [${nextChain.join(' => ')}]`);
        } else {
          this.processProject(dep, visited, nextChain);
          array(dep.descendents).forEach(pkg => project.descendents.add(pkg));
        }
      });
    }
  }

  private readJson <T> (filepath: string): T {
    return JSON.parse(fs.readFileSync(path.join(this.baseDir, filepath), { encoding: 'utf-8' }));
  }
}
