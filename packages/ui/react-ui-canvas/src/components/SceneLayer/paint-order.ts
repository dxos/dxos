//
// Copyright 2026 DXOS.org
//

import { type Node } from '@dxos/scene';

import { type LinkGeometry, sortByZ } from '../../utils/index.ts';

/** One of a layer's elements as the paint order holds it: a node, or a link with the geometry it was routed to. */
type LayerElement = { id: string; z: string; node?: Node; link?: LinkGeometry };

/** A run of consecutive elements of one kind: a run of links shares one `<svg>`, a run of nodes its frames. */
export type LayerRun = { kind: 'links'; links: LinkGeometry[] } | { kind: 'nodes'; nodes: Node[] };

/**
 * A layer's nodes and links in one paint order, bottom first, grouped into runs of consecutive elements of one kind:
 * a shape drawn over a link covers it and a link drawn over a shape crosses it, exactly as the Views list lists them.
 * An element written without a `z` sorts at the bottom, as it draws first. The selection is not raised: a shape sent
 * to the back stays there while it is worked on, its frame and handles being chrome at its edge.
 */
export const paintRuns = (nodes: readonly Node[], links: readonly LinkGeometry[]): LayerRun[] => {
  const own: LayerElement[] = [
    ...nodes.map((node) => ({ id: node.id, z: node.z ?? '', node })),
    ...links.map((link) => ({ id: link.link.id, z: link.link.z ?? '', link })),
  ];
  const runs: LayerRun[] = [];
  for (const { node, link } of sortByZ(own)) {
    const last = runs[runs.length - 1];
    if (link) {
      last?.kind === 'links' ? last.links.push(link) : runs.push({ kind: 'links', links: [link] });
    } else if (node) {
      last?.kind === 'nodes' ? last.nodes.push(node) : runs.push({ kind: 'nodes', nodes: [node] });
    }
  }
  return runs;
};
