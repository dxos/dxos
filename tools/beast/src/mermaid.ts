//
// Copyright 2022 DXOS.org
//

import ColorHash from 'color-hash';

import { Project } from './types';

const color = new ColorHash({ lightness: 0.9, saturation: 0.6 });

/**
 * Generate mermaid graph.
 * https://mermaid-js.github.io/mermaid/#/README
 * @param project
 */
export const generateMermaid = (project: Project) => {
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

  const config = {
    init: {
      flowchart: {
        curve: 'basis'
      }
    }
  };

  const content = [
    '```mermaid',
    // https://mermaid-js.github.io/mermaid/#/flowchart?id=styling-links
    `%%${config}%%`,
    // https://mermaid-js.github.io/mermaid/#/flowchart
    'flowchart LR;',
    '',
    ...sectionLabels,
    ...links,
    '```'
  ];

  return content.join('\n');
};
