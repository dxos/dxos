//
// Copyright 2026 DXOS.org
//

// What a subject graph's nodes and edges mean, as lighthouse's web UI (`web/src/components/GraphView.tsx`,
// `web/src/kit/GraphCard.tsx`) reads them: an edge's predicate family, a node's kind and icon.

import { type Entity, type GraphEdge, type GraphNode, type SubjectGraph } from '../../client/types.ts';
import { kindOf } from '../../model/results.ts';

/** Predicate families: what an edge means, which colours and styles it. */
export type Family = 'role' | 'author' | 'cite' | 'same' | 'other';

export const familyOf = (predicate: string): Family =>
  /sameAs$/.test(predicate)
    ? 'same'
    : /(author|creator|contributor|editor|composer|director|producer|publisher|translator|illustrator|maintainer)$/i.test(
          predicate,
        )
      ? 'author'
      : /(citation|cites|isBasedOn|references|legalBasis|amend|repeal|consolidat|citingJudgments|mentions|executes|implements)/i.test(
            predicate,
          )
        ? 'cite'
        : /(affiliation|worksFor|memberOf|alumniOf|employee|member|judge|court|organizer|performer|attendee|founder|party|hiringOrganization|parentOrganization|subOrganization|colleague|knows|sponsor|funder|legislationPassedBy|role)/i.test(
              predicate,
            )
          ? 'role'
          : 'other';

export const FAMILIES: readonly Family[] = ['role', 'author', 'cite', 'same', 'other'];

/** A CURIE split into its prefix (dimmed when shown) and its words: `schema:` + `works For`. */
export const splitCurie = (curie: string): { prefix: string; name: string } => {
  const match = /^([a-z]+:)(.*)$/.exec(curie);
  const local = (match?.[2] ?? curie).replace(/([a-z])([A-Z])/g, '$1 $2');
  return { prefix: match?.[1] ?? '', name: local };
};

const ICONS: Array<[RegExp, string]> = [
  [/Person/, 'ph--user--regular'],
  [/Investment/, 'ph--coins--regular'],
  [/VentureFund/, 'ph--vault--regular'],
  [/Role/, 'ph--identification-badge--regular'],
  [/CourtDecision|Court\b/, 'ph--gavel--regular'],
  [/Legislation|Legislative/, 'ph--scales--regular'],
  [/Organization|Corporation|College|University|Dealer|LocalBusiness|GovernmentOrganization/, 'ph--buildings--regular'],
  [/Periodical|Publication|Journal/, 'ph--books--regular'],
  [/Article|CreativeWork|Book|Thesis|Report|SoftwareSourceCode|Dataset|Posting/, 'ph--article--regular'],
  [/Event/, 'ph--calendar-dots--regular'],
  [/Listing|Residence|Apartment|House|Accommodation/, 'ph--house-line--regular'],
  [/JobPosting/, 'ph--briefcase--regular'],
  [/Place|Country|City|Address|AdministrativeArea/, 'ph--map-pin--regular'],
  [/Product|Vehicle/, 'ph--package--regular'],
];

export const iconOf = (types: readonly string[]): string =>
  ICONS.find(([pattern]) => types.some((type) => pattern.test(type)))?.[1] ??
  (types.length ? 'ph--circle--regular' : 'ph--link--regular');

/** A graph node as a result entity, so the card mapping reads it the same way. */
export const nodeEntity = (node: GraphNode): Entity => ({
  id: node.id,
  types: node.types,
  props: { 'schema:name': [node.label], ...node.props },
});

/** A node's kind ("Person", "Employee Role"); a node with no record in the store is a link. */
export const kindOfNode = (node: GraphNode): string => (node.types.length ? kindOf(nodeEntity(node)) : 'Link');

/** The edges that touch a node, with the node at their other end. */
export const neighboursOf = (
  graph: SubjectGraph,
  iri: string,
): Array<{ edge: GraphEdge; node: GraphNode; direction: 'out' | 'in' }> => {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  return graph.edges.flatMap((edge) => {
    const other = edge.from === iri ? edge.to : edge.to === iri ? edge.from : undefined;
    const node = other !== undefined ? byId.get(other) : undefined;
    return node ? [{ edge, node, direction: edge.from === iri ? ('out' as const) : ('in' as const) }] : [];
  });
};

/** The subgraph within `depth` hops of a node: what the companion's Relations shows. */
export const neighbourhood = (graph: SubjectGraph, iri: string, depth = 1): SubjectGraph => {
  const adjacency = new Map<string, string[]>();
  for (const edge of graph.edges) {
    adjacency.set(edge.from, [...(adjacency.get(edge.from) ?? []), edge.to]);
    adjacency.set(edge.to, [...(adjacency.get(edge.to) ?? []), edge.from]);
  }
  const hops = new Map([[iri, 0]]);
  const queue = [iri];
  while (queue.length) {
    const current = queue.shift();
    const hop = current !== undefined ? (hops.get(current) ?? 0) : depth;
    if (current === undefined || hop >= depth) {
      continue;
    }
    for (const next of adjacency.get(current) ?? []) {
      if (!hops.has(next)) {
        hops.set(next, hop + 1);
        queue.push(next);
      }
    }
  }
  return {
    roots: [iri],
    nodes: graph.nodes.filter((node) => hops.has(node.id)),
    edges: graph.edges.filter((edge) => hops.has(edge.from) && hops.has(edge.to)),
    more: Object.fromEntries(Object.entries(graph.more).filter(([id]) => hops.has(id))),
  };
};
