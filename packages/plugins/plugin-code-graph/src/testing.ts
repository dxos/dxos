//
// Copyright 2026 DXOS.org
//

import { Iri, Model } from '#graph';
import { type CodeGraph } from '#types';

const pkg = (name: string) => `${Iri.PACKAGE}@dxos/${name}`;

/** A slice of the real package graph, as `deus:usesPackage` reports it, for stories and tests without an index. */
const DEPENDENCIES: [string, string[]][] = [
  ['plugin-markdown', ['app-framework', 'react-ui-editor', 'echo', 'compute', 'react-ui']],
  ['plugin-illustrator', ['app-framework', 'diagram', 'echo', 'compute', 'react-ui-canvas']],
  ['react-ui-canvas', ['diagram', 'react-ui', 'util']],
  ['react-ui-editor', ['react-ui', 'ui-editor', 'util']],
  ['app-framework', ['echo', 'compute', 'log', 'util']],
  ['compute', ['echo', 'effect', 'log']],
  ['echo', ['keys', 'log', 'effect', 'util']],
  ['diagram', ['effect', 'util']],
  ['ui-editor', ['util']],
  ['react-ui', ['util']],
  ['effect', ['util']],
  ['log', ['util']],
  ['keys', ['util']],
];

export const SAMPLE_GRAPH: { nodes: CodeGraph.Node[]; edges: CodeGraph.Edge[] } = {
  nodes: [...new Set(DEPENDENCIES.flatMap(([from, to]) => [from, ...to]))].map((name) => Model.makeNode(pkg(name))),
  edges: DEPENDENCIES.flatMap(([from, to]) =>
    to.map((target) => ({ from: pkg(from), to: pkg(target), kind: 'usesPackage' })),
  ),
};

const file = (path: string) => `${Iri.FILE}packages/common/log/src/${path}`;

/** Files of one package and their imports: groups collapse to one frame, so the illustrator draws no frames. */
export const SAMPLE_FILES: { nodes: CodeGraph.Node[]; edges: CodeGraph.Edge[] } = (() => {
  const imports: [string, string[]][] = [
    ['index.ts', ['log.ts', 'context.ts', 'config.ts', 'processors/index.ts']],
    ['log.ts', ['context.ts', 'config.ts', 'meta.ts']],
    ['processors/index.ts', ['processors/console-processor.ts', 'processors/file-processor.ts']],
    ['processors/console-processor.ts', ['context.ts', 'config.ts']],
    ['processors/file-processor.ts', ['context.ts']],
    ['context.ts', ['meta.ts']],
  ];
  return {
    nodes: [...new Set(imports.flatMap(([from, to]) => [from, ...to]))].map((path) => Model.makeNode(file(path))),
    edges: imports.flatMap(([from, to]) =>
      to.map((target) => ({ from: file(from), to: file(target), kind: 'imports' })),
    ),
  };
})();
