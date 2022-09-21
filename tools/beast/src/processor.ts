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
  dependencies: Set<Project>
  descendents?: Set<string>
  cycles?: string[][]
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
  } = {}): Project | undefined {
    const { projects } = this.readJson<WorkspaceJson>('workspace.json');

    // TODO(burdon): Support filtering outside of workspace (e.g., crypto).

    // Lazily evaluated map of packages indexed by package name.
    const projectsByName = new Map<string, Project>();
    const projectsByPackage = new Map<string, Project>();
    for (const name of Object.keys(projects)) {
      const subdir = projects[name];
      const packageJson = this.readJson<PackageJson>(path.join(subdir, 'package.json'));
      const project: Project = {
        package: packageJson,
        subdir,
        dependencies: new Set<Project>()
      };

      projectsByName.set(name, project);
      projectsByPackage.set(packageJson.name, project);
    }

    if (projectName && filter) {
      const project = projectsByName.get(projectName);
      if (project) {
        const cycles: string[][] = [];

        // Recursively process deps.
        const processDeps = (project: Project, chain: string[] = [project.package.name]): Project[] => {
          const { package: { dependencies } } = project;
          const deps: Project[] = Object.keys(dependencies)
            .filter(minimatch.filter(filter))
            .map(dep => projectsByPackage.get(dep))
            .filter(Boolean) as Project[]; // TOOD(burdon): Warn if undefined.

          if (!project.descendents) {
            project.descendents = new Set();
            deps.forEach(dep => {
              project.dependencies.add(dep);
              project.descendents!.add(dep.package.name);

              const nextChain = [...chain, dep.package.name];
              if (chain.indexOf(dep.package.name) !== -1) {
                cycles.push(nextChain);
              } else {
                const sub = processDeps(dep, nextChain);
                sub.forEach(sub => project.descendents!.add(sub.package.name));
              }
            });
          }

          return deps;
        };

        processDeps(project);

        if (cycles.length) {
          cycles.forEach(cycle => log.warn(`Cycle detected: [${cycle.join(' => ')}]`));
          project.cycles = cycles;
        }

        return project;
      }
    }
  }

  createDocs (project: Project, docsDir = './docs') {
    const baseDir = path.join(this.baseDir, project.subdir, docsDir);
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    const content = `# ${project.package.name}\n\n${generateMermaid(project)}`;

    fs.writeFileSync(path.join(baseDir, 'README.md'), content);
  }

  private readJson <T> (filepath: string): T {
    return JSON.parse(fs.readFileSync(path.join(this.baseDir, filepath), { encoding: 'utf-8' }));
  }
}

const generateMermaid = (project: Project) => {
  const links: string[] = [];

  const content = [
    '```mermaid',
    'graph TD;',
    ...links,
    '```'
  ];

  return content.join('\n');
};
