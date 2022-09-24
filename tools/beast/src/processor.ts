//
// Copyright 2022 DXOS.org
//

import ColorHash from 'color-hash';
import fs from 'fs';
import minimatch from 'minimatch';
import path from 'path';

import { log } from '@dxos/log';

import { PackageJson, Project, WorkspaceJson } from './types';

const color = new ColorHash({ lightness: 0.9, saturation: 0.6 });

/**
 * Process packages in workspace.
 */
export class Processor {
  private readonly projectsByName = new Map<string, Project>();
  private readonly projectsByPackage = new Map<string, Project>();

  constructor (
    private readonly baseDir: string
  ) {
    this.init();
  }

  get projects (): Project[] {
    return Array.from(this.projectsByPackage.values());
  }

  match (filter?: string): Project[] {
    return filter ? this.projects.filter(p => minimatch(p.name, filter)) : this.projects;
  }

  init () {
    const { projects } = this.readJson<WorkspaceJson>('workspace.json');

    // Lazily evaluated map of packages indexed by package name.
    for (const name of Object.keys(projects)) {
      const subdir = projects[name];
      const packageJson = this.readJson<PackageJson>(path.join(subdir, 'package.json'));
      const project: Project = {
        name,
        subdir,
        package: packageJson,
        dependencies: new Set<Project>()
      };

      this.projectsByName.set(name, project);
      this.projectsByPackage.set(packageJson.name, project);
    }

    return this;
  }

  process (projectName: string, {
    filter
  }: {
    filter?: string
  } = {}): Project | undefined {
    // TODO(burdon): Support filtering outside of workspace (e.g., crypto).
    if (projectName && filter) {
      const project = this.projectsByName.get(projectName);
      if (project) {
        const cycles: string[][] = [];

        // Recursively process deps.
        const processDeps = (project: Project, chain: string[] = [project.package.name]): Project[] => {
          const { package: { dependencies = [] } } = project;
          const deps: Project[] = Object.keys(dependencies)
            .filter(minimatch.filter(filter))
            .map(dep => this.projectsByPackage.get(dep))
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

  // TODO(burdon): Use remark lib (see ridoculous).
  createDocs (project: Project, docsDir: string, baseUrl: string) {
    const baseDir = path.join(this.baseDir, project.subdir, docsDir);
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    const content = [
      `# ${project.package.name}\n`,
      project.package.description,
      '',
      '## Dependency Graph\n',
      this.generateMermaid(project, docsDir, baseUrl),
      '',
      '## Dependencies\n',
      this.generateDependenciesTable(project, docsDir),
      ''
    ];

    fs.writeFileSync(path.join(baseDir, 'README.md'), content.join('\n'));
  }

  /**
   * Create table.
   */
  private generateDependenciesTable (project: Project, docsDir: string) {
    const dir = project.subdir;
    const createLink = (p: Project) => {
      const name = p.package.name;
      const link = path.join('../', path.relative(dir, p.subdir), docsDir, 'README.md');
      return `[\`${name}\`](${link})`;
    };

    const content = [
      '| Module | Direct |',
      '|---|---|'
    ];

    Array.from(project.descendents!.values()).sort().forEach(name => {
      const sub = this.projectsByPackage.get(name)!;
      const link = createLink(sub);
      // TODO(burdon): Test ":heavy_check_mark:"
      //  https://github.com/StylishThemes/GitHub-Dark/wiki/Emoji
      content.push(`| ${link} | ${project.dependencies.has(sub) ? '&check;' : ''} |`);
    });

    return content.join('\n');
  }

  /**
   * Generate mermaid graph.
   * https://mermaid-js.github.io/mermaid/#/README
   * @param project
   */
  generateMermaid (project: Project, docsDir: string, baseUrl: string) {
    const safeName = (name: string) => name.replace(/@/g, '');

    // TODO(burdon): Heuristic.
    // TODO(burdon): Sub-graphs based on directories.
    //  https://mermaid-js.github.io/mermaid/#/flowchart?id=subgraphs
    const sectionName = (subdir: string): string => {
      const parts = subdir.split('/');
      parts.pop();
      return parts.pop()!; // Second to last.
    };

    const visited = new Set<Project>();

    const links: string[] = [];
    const addLinks = (project: Project) => {
      visited.add(project);
      project.dependencies.forEach(sub => {
        // TODO(burdon): Option to show/hide transitive dependencies.
        if (!Array.from(project.dependencies.values()).some(p => p.descendents?.has(sub.package.name))) {
          links.push(`${safeName(project.package.name)} --> ${safeName(sub.package.name)};`);
        } else {
          // links.push(`${safeName(project.package.name)} -.-> ${safeName(sub.package.name)};`);
        }

        if (!visited.has(sub)) {
          addLinks(sub);
        }
      });
    };

    addLinks(project);

    const sections: Map<string, string[]> = Array.from(visited.values())
      .reduce((result, project) => {
        const name = project.package.name;
        const folder = sectionName(project.subdir);
        const label = `${safeName(name)}("${name}");`;

        let labels = result.get(folder);
        if (labels) {
          labels.push(label);
        } else {
          labels = [label];
          result.set(folder, labels);
        }

        return result;
      }, new Map<string, string[]>());

    const sectionLabels = Array.from(sections.entries()).map(([section, labels]) => {
      return [
        `subgraph ${section}`,
        `  style ${section} fill:${color.hex(section)},stroke:#fff;`,
        labels.map(label => `  ${label}`).join('\n'),
        'end\n'
      ].join('\n');
    });

    const hyperlinks = Array.from(project.descendents?.values() ?? []).map(project => {
      const subdir = this.projectsByPackage.get(project)!.subdir;
      return `click ${safeName(project)} "${path.join(baseUrl, '/tree/main/', subdir, docsDir)}";`;
    });

    const content = [
      '```mermaid',
      'flowchart LR;',
      '',
      `style ${safeName(project.package.name)} fill:#fff,stroke-width:4px;`,
      '',
      ...hyperlinks,
      '',
      ...sectionLabels,
      ...links,
      '```'
    ];

    return content.join('\n');
  }

  private readJson <T> (filepath: string): T {
    return JSON.parse(fs.readFileSync(path.join(this.baseDir, filepath), { encoding: 'utf-8' }));
  }
}
