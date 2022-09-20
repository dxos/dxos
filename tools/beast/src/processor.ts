//
// Copyright 2022 DXOS.org
//

import fs from 'fs';
import minimatch from 'minimatch';
import path from 'path';

import { log } from '@dxos/log';

type WorkspaceJson = {
  projects: {[idx: string]: string}
}

type PackageJson = {
  name: string
  version: string
  dependencies: {[idx: string]: string}
}

type Project = {
  package: PackageJson
  subdir: string
  descendents?: Set<string>
}

// TODO(burdon): Create dot files.
// TODO(burdon): Update MD files (w/ ridoculous).
/**
 * Process packages in workspace.
 */
export class Processor {
  constructor (
    private readonly baseDir: string
  ) {}

  run ({
    project: projectName,
    filter,
    verbose
  }: {
    project?: string
    filter?: string
    verbose?: boolean
  } = {}) {
    const { projects } = this.readJson<WorkspaceJson>('workspace.json');

    // TODO(burdon): Support filtering outside of workspace (require dynamic lookup).

    // Lazily evaluated map of packages indexed by package name.
    const projectsByName = new Map<string, Project>();
    const projectsByPackage = new Map<string, Project>();
    for (const name of Object.keys(projects)) {
      const subdir = projects[name];
      const packageJson = this.readJson<PackageJson>(path.join(subdir, 'package.json'));
      const project: Project = {
        package: packageJson,
        subdir
      };

      projectsByName.set(name, project);
      projectsByPackage.set(packageJson.name, project);
    }

    if (projectName && filter) {
      const project = projectsByName.get(projectName);
      if (project) {
        // Recursively process deps.
        // TODO(burdon): Detect circular deps.
        const processDeps = (project: Project): Project[] => {
          const { package: { dependencies } } = project;
          const deps: Project[] = Object.keys(dependencies)
            .filter(minimatch.filter(filter))
            .map(dep => projectsByPackage.get(dep))
            .filter(Boolean) as Project[]; // TOOD(burdon): Warn if undefined.

          if (!project.descendents) {
            project.descendents = new Set();
            deps.forEach(dep => {
              project.descendents!.add(dep.package.name);

              const sub = processDeps(dep);
              sub.forEach(sub => project.descendents!.add(sub.package.name));
            });
          }

          return deps;
        };

        processDeps(project);

        log.info('Done', {
          name: project.package.name,
          descendents: [...project.descendents!.values()].sort()
        });

        process.exit();
      }
    }

    log.error('Not found', { projectName, filter });
  }

  private readJson <T> (filepath: string): T {
    return JSON.parse(fs.readFileSync(path.join(this.baseDir, filepath), { encoding: 'utf-8' }));
  }
}
