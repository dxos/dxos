//
// Copyright 2022 DXOS.org
//

import ColorHash from 'color-hash';
import fs from 'fs';
import minimatch from 'minimatch';
import path from 'path';

import { Flowchart } from './mermaid';
import { PackageJson, Project, WorkspaceJson } from './types';

// TODO(burdon): Factor out.
const array = <T> (collection: Set<T> | Map<any, T>): T[] => Array.from(collection.values() ?? []);

const colorHash = new ColorHash({
  lightness: 0.8
  // hue: [ { min: 30, max: 90 }, { min: 180, max: 210 }, { min: 270, max: 285 } ]
});

type ModuleProcessorOptions = {
  verbose?: boolean
  include?: string
  exclude?: string[] // TODO(burdon): Regexp or array.
}

/**
 * Process packages in workspace.
 */
export class ModuleProcessor {
  public readonly projectsByName = new Map<string, Project>();
  public readonly projectsByPackage = new Map<string, Project>();

  constructor (
    private readonly baseDir: string,
    private readonly options: ModuleProcessorOptions = {}
  ) {}

  get projects (): Project[] {
    return array(this.projectsByPackage);
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

    array(project.descendents).sort().forEach(pkg => {
      const sub = this.projectsByPackage.get(pkg)!;
      const link = createLink(sub);
      content.push(`| ${link} | ${array(project.dependencies).some(sub => sub.package.name === pkg) ? '&check;' : ''} |`);
    });

    return content.join('\n');
  }

  /**
   * Generate mermaid graph.
   * https://mermaid.live
   * https://mermaid-js.github.io/mermaid/#/README
   */
  // TODO(burdon): Create graph object.
  generateGraph (project: Project, docsDir: string, baseUrl: string) {
    const safeName = (name: string) => name.replace(/@/g, '');

    const flowchart = new Flowchart({
      linkStyle: {
        'stroke': '#333',
        'stroke-width': '1px'
      }
    });

    flowchart
      .addClassDef('def', {
        'fill': '#fff',
        'stroke': '#333',
        'stroke-width': '1px'
      })
      .addClassDef('root', {
        'fill': '#fff',
        'stroke': '#333',
        'stroke-width': '4px'
      });

    const visited = new Set<Project>();

    //
    // Links
    //
    {
      const addLinks = (current: Project) => {
        visited.add(current);

        current.dependencies.forEach(sub => {
          if (
            // Don't link excluded packages.
            !this.options.exclude?.includes(sub.package.name) &&
            // Skip any descendents that depend directly on the package.
            !array(current.dependencies).some(pkg => pkg.descendents.has(sub.package.name))
          ) {
            flowchart.addLink({
              source: safeName(current.package.name),
              target: safeName(sub.package.name)
            });
          }

          if (!visited.has(sub)) {
            addLinks(sub);
          }
        });
      };

      addLinks(project);
    }

    //
    // Subgraphs
    //
    {
      // TODO(burdon): Get from package.json metadata?
      const sectionName = (subdir: string): string => {
        const parts = subdir.split('/');
        parts.pop();
        return parts.pop()!; // Second to last.
      };

      // Reduce packages into folders.
      const sectionDefs: Map<string, string[]> = array(visited).reduce((result, project) => {
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

      Array.from(sectionDefs.entries()).forEach(([section, packages]) => {
        const [included, excluded] = packages.reduce<[string[], string[]]>(([included, excluded], pkg) => {
          if (this.options.exclude?.includes(pkg)) {
            excluded.push(pkg);
          } else {
            included.push(pkg);
          }
          return [included, excluded];
        }, [[], []]);

        // Main graph.
        const graph = flowchart.addSubgraph({
          id: section,
          style: {
            'fill': colorHash.hex(section),
            'stroke': '#fff'
          }
        });

        included.forEach(pkg => graph.addNode({
          id: safeName(pkg),
          label: pkg,
          className: pkg === project.package.name ? 'root' : 'def',
          href: path.join(baseUrl, this.projectsByPackage.get(pkg)!.subdir, docsDir)
        }));

        // Common packages with links removed.
        if (excluded.length) {
          const subgraph = graph.addSubgraph({
            id: `${section}-excluded`,
            label: ' ',
            style: {
              'fill': colorHash.hex(section),
              'stroke': '#333',
              'stroke-dasharray': '5 5'
            }
          });

          excluded.forEach(pkg => subgraph.addNode({
            id: safeName(pkg),
            label: pkg,
            className: 'def',
            href: path.join(baseUrl, this.projectsByPackage.get(pkg)!.subdir, docsDir)
          }));
        }
      });
    }

    return flowchart.render();
  }

  private readJson <T> (filepath: string): T {
    return JSON.parse(fs.readFileSync(path.join(this.baseDir, filepath), { encoding: 'utf-8' }));
  }
}
