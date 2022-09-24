//
// Copyright 2022 DXOS.org
//

import ColorHash from 'color-hash';
import fs from 'fs';
import minimatch from 'minimatch';
import path from 'path';

import { PackageJson, Project, WorkspaceJson } from './types';

const colorHash = new ColorHash({
  lightness: 0.8,
  // hue: [ { min: 30, max: 90 }, { min: 180, max: 210 }, { min: 270, max: 285 } ]
});

/**
 * Process packages in workspace.
 */
export class Processor {
  public readonly projectsByName = new Map<string, Project>();
  public readonly projectsByPackage = new Map<string, Project>();

  constructor (
    private readonly baseDir: string,
    private readonly include: string = '*',
    private readonly exclude: string[] = [] // TODO(burdon): Regexp or array.
  ) {}

  get projects (): Project[] {
    return Array.from(this.projectsByPackage.values());
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
        descendents: new Set<string>()
      };

      this.projectsByName.set(name, project);
      this.projectsByPackage.set(packageJson.name, project);
    }

    // Process all projects.
    const visited = new Set<string>();
    for (const project of Array.from(this.projectsByName.values())) {
      this.processProject(visited, project);
    }

    return this;
  }

  private processProject (visited: Set<string>, project: Project) {
    // console.log('Processing:', project.package.name);
    const cycles: string[][] = [];

    // Recursively process deps.
    const processDeps = (project: Project, chain: string[] = [project.package.name]): Project[] => {
      const { package: { dependencies = [] } } = project;

      // TODO(burdon): Support filtering outside of workspace (e.g., crypto) without recursion.
      const deps: Project[] = Object.keys(dependencies)
        .filter(minimatch.filter(this.include))
        .map(dep => this.projectsByPackage.get(dep))
        .filter(Boolean) as Project[];

      // Check if already processed (since depth first).
      if (!visited.has(project.package.name)) {
        visited.add(project.package.name);

        deps.forEach(dep => {
          project.dependencies.add(dep);
          project.descendents.add(dep.package.name);

          const nextChain = [...chain, dep.package.name];
          if (chain.includes(dep.package.name)) {
            cycles.push(nextChain);
          } else {
            const deps = processDeps(dep, nextChain);
            deps.forEach(sub => {
              project.descendents.add(sub.package.name)
            });
          }
        });
      }

      return deps;
    };

    processDeps(project);

    if (cycles.length) {
      cycles.forEach(cycle => console.warn(`Cycle detected: [${cycle.join(' => ')}]`));
      project.cycles = cycles;
    }
  }

  /**
   * Create docs page.
   */
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
      this.generateGraph(project, docsDir, baseUrl),
      '',
      '## Dependencies\n',
      this.generateDependenciesTable(project, docsDir),
      ''
    ];

    fs.writeFileSync(path.join(baseDir, 'README.md'), content.join('\n'));
  }

  //
  // Generators
  //

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

    Array.from(project.descendents.values()).sort().forEach(name => {
      const sub = this.projectsByPackage.get(name)!;
      const link = createLink(sub);
      // TODO(burdon): Test ":heavy_check_mark:"
      //  https://github.com/StylishThemes/GitHub-Dark/wiki/Emoji
      // content.push(`| ${link} | ${project.dependencies.has(sub) ? '&check;' : ''} |`);
      content.push(`| ${link} | ${Array.from(project.dependencies.values()).some(sub => sub.package.name === name) ? '&check;' : ''} |`);
    });

    return content.join('\n');
  }

  /**
   * Generate mermaid graph.
   * https://mermaid-js.github.io/mermaid/#/README
   */
  generateGraph (project: Project, docsDir: string, baseUrl: string) {
    const safeName = (name: string) => name.replace(/@/g, '');

    const content: string[][] = [];
    const visited = new Set<Project>();

    //
    // Links
    // https://mermaid-js.github.io/mermaid/#/flowchart?id=links-between-nodes
    //
    {
      const links: string[] = [
        '%% Links'
      ];

      const addLinks = (project: Project) => {
        visited.add(project);
        project.dependencies.forEach(sub => {
          // TODO(burdon): Option to show/hide transitive dependencies (light line).
          if (
            !this.exclude.includes(sub.package.name)
            && !Array.from(project.dependencies.values()).some(p => p.descendents.has(sub.package.name))
          ) {
            links.push(`${safeName(project.package.name)} --> ${safeName(sub.package.name)};`);
          }

          if (!visited.has(sub)) {
            addLinks(sub);
          }
        });
      };

      addLinks(project);
      content.push(links.sort());
    }

    //
    // Sections
    // https://mermaid-js.github.io/mermaid/#/flowchart?id=subgraphs
    //
    {
      const sectionName = (subdir: string): string => {
        const parts = subdir.split('/');
        parts.pop();
        return parts.pop()!; // Second to last.
      };

      // Reduce packages into folders.
      const sectionDefs: Map<string, string[]> = Array.from(visited.values()).reduce((result, project) => {
        const name = project.package.name;

        // Group by folders.
        const folder = sectionName(project.subdir);
        let labels = result.get(folder);
        if (labels) {
          labels.push(name);
        } else {
          labels = [name];
          result.set(folder, labels);
        }

        return result;
      }, new Map<string, string[]>());

      const sections = Array.from(sectionDefs.entries()).map(([section, packages]) => {
        const [included, excluded] = packages.reduce<[string[], string[]]>(([included, excluded], pkg) => {
          if (this.exclude.includes(pkg)) {
            excluded.push(pkg);
          } else {
            included.push(pkg)
          }
          return [included, excluded];
        }, [[], []]);

        // Common packages with links removed.
        const excludedGraph = excluded.length ? [
          '',
          `  subgraph ${section}-excluded [ ]`,
          `    style ${section}-excluded fill:${colorHash.hex(section)},stroke:#333,stroke-dasharray:5 5;\n`,
          excluded.map(name => `    ${safeName(name)}("${name}")`).sort().join('\n'),
          '  end'
        ].join('\n') : undefined;

        return [
          `subgraph ${section}`,
          `  style ${section} fill:${colorHash.hex(section)},stroke:#fff;\n`,
          included.map(name => `  ${safeName(name)}("${name}")`).sort().join('\n'),
          excludedGraph,
          'end\n'
        ].filter(Boolean).join('\n');
      });

      content.push(['%% Sections', ...sections]);
    }

    //
    // Hyperlinks
    // https://mermaid-js.github.io/mermaid/#/flowchart?id=interaction
    //
    {
      const hyperlinks = Array.from(project.descendents.values() ?? []).sort().map(project => {
        const subdir = this.projectsByPackage.get(project)!.subdir;
        return `click ${safeName(project)} href "${path.join(baseUrl, subdir, docsDir)}";`;
      });

      content.push(['%% Hyperlinks', ...hyperlinks]);
    }

    //
    // Styles
    // https://mermaid-js.github.io/mermaid/#/flowchart?id=styling-and-classes
    //
    {
      const styles = [
        '%% Styles',
        'classDef rootNode fill:#fff,stroke:#333,stroke-width:2px',
        'classDef defaultNode fill:#fff,stroke:#333,stroke-width:1px',
        'linkStyle default stroke:#333,stroke-width:1px',
        '',
        `${safeName(project.package.name)}:::rootNode`,
        '',
        ...Array.from(project.descendents.values() ?? []).sort().map(name => `${safeName(name)}:::defaultNode`)
      ];

      content.push(styles);
    }

    // https://mermaid-js.github.io/mermaid/#/flowchart?id=styling-line-curves
    const config = {
      flowchart: {
        curve: 'basis'
      }
    }

    const defs = [
      '```mermaid',
      `%%{ init: ${JSON.stringify(config).replace(/"/g, '\'')} }%%\n`,
      'flowchart LR',
      ...content.map(lines => ['', ...lines]).flat(),
      '```'
    ];

    return defs.join('\n');
  }

  private readJson <T> (filepath: string): T {
    return JSON.parse(fs.readFileSync(path.join(this.baseDir, filepath), { encoding: 'utf-8' }));
  }
}
