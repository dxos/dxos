//
// Copyright 2022 DXOS.org
//

import ColorHash from 'color-hash';
import fs from 'fs';
import path from 'path';

import { Flowchart, SubgraphBuilder } from './mermaid';
import { Project, ProjectMap } from './types';
import { array } from './util';

const colorHash = new ColorHash({
  lightness: 0.95,
  saturation: 0.6,
  // hue: [
  //   { min: 100, max: 360 },
  //   { min: 200, max: 360 },
  //   { min: 200, max: 360 }
  // ]
});

type PackageDependencyBuilderOptions = {
  verbose?: boolean

  // Don't show links for these packages.
  exclude?: string[]
}

/**
 * Builder for a package dependency graph.
 */
export class PackageDependencyBuilder {
  constructor (
    private readonly _baseDir: string,
    private readonly _projectMap: ProjectMap,
    private readonly _options: PackageDependencyBuilderOptions
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

    array(project.descendents).sort().forEach(packageName => {
      const sub = this._projectMap.getProjectByPackage(packageName)!;
      const link = createLink(sub);
      content.push(`| ${link} | ${array(project.dependencies).some(sub => sub.package.name === packageName) ? '&check;' : ''} |`);
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
            !array(current.dependencies).some(packageName => packageName.descendents.has(sub.package.name))
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

      type Folder = { label: string, folders?: Map<string, Folder>, packages: string[] }

      const root = new Map<string, Folder>();

      //
      // Map projects into folder tree.
      //
      {
        const getOrCreateFolder = (folders: Map<string, Folder>, parts: string[]): Folder => {
          const [name, ...rest] = parts;
          let folder = folders.get(name);
          if (!folder) {
            folder = {
              label: name,
              packages: [],
              folders: new Map<string, Folder>()
            };

            folders.set(name, folder);
          }

          if (rest.length) {
            return getOrCreateFolder(folder.folders!, rest);
          } else {
            return folder;
          }
        };

        array(visited).forEach(project => {
          // TODO(burdon): Better way to remove "packages/".
          const [ignore, ...parts] = project.subdir.split('/');
          parts.pop();
          if (this._options.exclude?.includes(project.package.name)) {
            parts.push('_');
          }

          const folder = getOrCreateFolder(root, parts);
          folder.packages.push(project.package.name);
        });
      }

      //
      // Construct graph tree.
      //
      {
        const process = (graph: SubgraphBuilder, folders: Map<string, Folder>, parent?: Folder) => {
          array(folders).forEach(folder => {
            const hidden = parent && folder.label === '_';
            const sub = graph.addSubgraph({
              id: folder.label,
              label: hidden ? ' ' : folder.label,
              style: hidden ? {
                'fill': colorHash.hex(parent.label),
                'stroke': '#333',
                'stroke-dasharray': '5 5'
              } : {
                'fill': colorHash.hex(folder.label),
                'stroke': '#333'
              }
            });

            folder.packages.forEach(packageName => {
              sub.addNode({
                id: safeName(packageName),
                label: packageName,
                className: packageName === project.package.name ? 'root' : 'def',
                href: path.join(baseUrl, this._projectMap.getProjectByPackage(packageName)!.subdir, docsDir)
              });
            });

            if (folder.folders) {
              process(sub, folder.folders, folder);
            }
          });
        }

        process(flowchart, root);
      }
    }

    return flowchart.render();
  }
}
