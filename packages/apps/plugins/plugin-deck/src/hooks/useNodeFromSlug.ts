//
// Copyright 2024 DXOS.org
//

import { type Graph, type Node } from '@braneframe/plugin-graph';
import { SLUG_PATH_SEPARATOR, parseSlug } from '@dxos/app-framework';

import { useNodes } from './useNode';

export const useNodesFromSlugs = (
  graph: Graph,
  slugs: string[],
): { id: string; node?: Node; path?: string; solo?: boolean }[] => {
  const parsedSlugs = slugs.map(parseSlug);

  const nodes = useNodes(
    graph,
    parsedSlugs.map(({ id }) => id),
  );

  return parsedSlugs.map(({ id, path, solo }) => {
    const node = nodes.find((node) => node.id === id);

    if (!node) {
      return { id, solo };
    } else if (path.length > 0) {
      return { id, node, path: path.join(SLUG_PATH_SEPARATOR), solo };
    } else {
      return { id, node, solo };
    }
  });
};
