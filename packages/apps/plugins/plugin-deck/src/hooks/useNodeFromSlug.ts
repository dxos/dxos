//
// Copyright 2024 DXOS.org
//

import { type Graph, type Node } from '@braneframe/plugin-graph';
import { SLUG_PATH_SEPARATOR } from '@dxos/app-framework';

import { useNodes } from './useNode';

export const useNodesFromSlugs = (graph: Graph, slugs: string[]): { id: string; node?: Node; path?: string }[] => {
  const splitSlugs = slugs.map((slug) => {
    const [id, ...path] = slug.split(SLUG_PATH_SEPARATOR);
    return { id, path };
  });
  const nodes = useNodes(
    graph,
    splitSlugs.map(({ id }) => id),
  );

  return splitSlugs.map(({ id, path }) => {
    const node = nodes.find((node) => node.id === id);
    if (!node) {
      return { id };
    } else if (path.length > 0) {
      return { id, node, path: path.join(SLUG_PATH_SEPARATOR) };
    } else {
      return { id, node };
    }
  });
};
