//
// Copyright 2022 DXOS.org
//

import ColorHash from 'color-hash';
import fs from 'fs';
import path from 'path';

import { Flowchart } from './mermaid';
import { Project, ProjectMap } from './types';
import { array } from './util';

const colorHash = new ColorHash({
  lightness: 0.8
  // hue: [ { min: 30, max: 90 }, { min: 180, max: 210 }, { min: 270, max: 285 } ]
});

type GraphBuilderOptions = {
  verbose?: boolean

  // Don't show links for these packages.
  exclude?: string[]
}

export class GraphBuilder {
  constructor (
    private readonly _baseDir: string,
    private readonly _projectMap: ProjectMap,
    private readonly _options: GraphBuilderOptions
  ) {}

  /**
   * Create docs page.
   */
  // TODO(burdon): Use remark lib (see ridoculous).
  createDocs (project: Project, docsDir: string, baseUrl: string) {
    const baseDir = path.join(this._baseDir, project.subdir, docsDir);
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    const content = [
      `# ${project.package.name}\n`,
      project.package.description,
      '',
      '## Dependency Graph\n',
      this.generatePackageGraph(project, docsDir, baseUrl),
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

    array(project.descendents).sort().forEach(pkg => {
      const sub = this._projectMap.getProjectByPackage(pkg)!;
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
  generatePackageGraph (project: Project, docsDir: string, baseUrl: string) {
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
            !this._options.exclude?.includes(sub.package.name) &&
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
          if (this._options.exclude?.includes(pkg)) {
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
          href: path.join(baseUrl, this._projectMap.getProjectByPackage(pkg)!.subdir, docsDir)
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
            href: path.join(baseUrl, this._projectMap.getProjectByPackage(pkg)!.subdir, docsDir)
          }));
        }
      });
    }

    return flowchart.render();
  }
}
