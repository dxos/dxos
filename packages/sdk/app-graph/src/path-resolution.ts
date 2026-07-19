//
// Copyright 2026 DXOS.org
//

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Record from 'effect/Record';

import { EntityId, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { Position } from '@dxos/util';

import * as Graph from './graph';
import * as GraphBuilder from './graph-builder';
import * as Node from './node';

/**
 * A single `(prefix, id?)` pair as parsed by `@dxos/app-toolkit`'s `UrlPath.parse`. Kept as a
 * plain structural type here (rather than importing `UrlPath.Pair`) because app-graph must not
 * depend on app-toolkit.
 */
export type UrlPair = {
  key: string;
  id?: string;
  workspace: string;
};

/**
 * A resolved pair: the index it occupied in the parsed chain, and the qualified graph node id it
 * resolved to. `null` in the caller's result array means the pair didn't resolve (unknown key or
 * no matching node) — callers route that to a not-found page.
 */
export type ResolvedPair = {
  pairIndex: number;
  nodeId: string;
};

/** The graph-path representation of a node, the reverse of a `UrlPair` (minus the `id` for companions). */
export type RepresentedNode = {
  key: string;
  id?: string;
  workspace: string;
};

/** Prefix marking a "linked segment" (companion) node id, e.g. `<parent>/~comments`. Mirrors the
 * convention established by `@dxos/react-ui-attention`'s `linkedSegment`/`isLinkedSegment`, duplicated
 * here (rather than imported) to keep app-graph free of a UI-layer dependency. */
const LINKED_PREFIX = '~';

/** Reserved words that can never be registered as a `urlKey`, duplicated from `UrlPath.isReservedKey`
 * (rather than imported) to keep app-graph free of an app-toolkit dependency. */
const RESERVED_URL_KEYS = new Set(['w', 'reset', 'redirect', 'not-found']);

const isReservedUrlKey = (key: string): boolean =>
  RESERVED_URL_KEYS.has(key) || SpaceId.isValid(key) || EntityId.isValid(key);

/**
 * Build the global `urlKey -> extensionId` table from the builder's current extensions, ordered by
 * Position then insertion order (matching connector-ordering semantics elsewhere in this package).
 * The first registration of a key wins; later ones, and any reserved-word key, are dropped with a
 * `log.warn`. Recomputed on every call — cheap (a synchronous scan of already-registered extensions)
 * and always current, so activating/deactivating plugins can never leave a stale table around.
 */
const buildKeyTable = (builder: GraphBuilder.GraphBuilder): Map<string, string> => {
  const extensions = Function.pipe(Record.values(builder.getExtensions()), Array.sortBy(Position.compare));

  const table = new Map<string, string>();
  for (const extension of extensions) {
    const key = extension.urlKey;
    if (!key) {
      continue;
    }
    if (isReservedUrlKey(key)) {
      log.warn('reserved URL prefix key', { key, extension: extension.id });
      continue;
    }
    if (table.has(key)) {
      log.warn('duplicate URL prefix key', { key, extension: extension.id });
      continue;
    }
    table.set(key, extension.id);
  }
  return table;
};

/**
 * Per-builder cache of `urlKey -> ancestor path template` (the segments between the workspace base
 * and a resolved node, excluding the final id segment), learned as `resolveUrl` finds nodes. A hit
 * lets subsequent lookups for the same key skip straight to a candidate id instead of re-running the
 * full BFS. Keyed by builder identity (a `WeakMap`) so it doesn't leak past the builder's lifetime and
 * doesn't need explicit invalidation — a shape that stops matching just falls back to BFS.
 */
const shapeCaches = new WeakMap<GraphBuilder.GraphBuilder, Map<string, string[]>>();

const getShapeCache = (builder: GraphBuilder.GraphBuilder): Map<string, string[]> => {
  const existing = shapeCaches.get(builder);
  if (existing) {
    return existing;
  }
  const cache = new Map<string, string[]>();
  shapeCaches.set(builder, cache);
  return cache;
};

/** Depth limit for the guided BFS fallback, per the design's fixed bound. */
const BFS_DEPTH_LIMIT = 6;

/**
 * Expand every ancestor prefix of a qualified node id (including the id itself), then flush once.
 * Mirrors `@dxos/app-toolkit`'s `NotFound.expandPath` technique, reimplemented locally so app-graph
 * doesn't depend on app-toolkit.
 */
const expandAncestors = async (builder: GraphBuilder.GraphBuilder, qualifiedId: string): Promise<void> => {
  const segments = qualifiedId.split('/');
  for (let index = 1; index <= segments.length; index++) {
    Graph.expand(builder.graph, segments.slice(0, index).join('/'), 'child');
  }
  await GraphBuilder.flush(builder);
};

/**
 * Guided breadth-first search from the workspace base for a node produced by `extensionId` whose
 * last id segment equals `id`. Expands one level at a time (batching all frontier expands into a
 * single flush per level) and inspects each newly-known node's provenance — connectors remain the
 * only thing that constructs nodes; this only finds/expands. Bounded by `BFS_DEPTH_LIMIT`.
 */
const bfsResolve = async (
  builder: GraphBuilder.GraphBuilder,
  workspaceBaseId: string,
  extensionId: string,
  id: string,
): Promise<string | null> => {
  const graph = builder.graph;

  // The workspace node itself is root's child; make sure it's materialized before expanding it.
  Graph.expand(graph, Node.RootId, 'child');
  await GraphBuilder.flush(builder);

  let frontier = [workspaceBaseId];
  const visited = new Set<string>(frontier);

  for (let depth = 0; depth < BFS_DEPTH_LIMIT; depth++) {
    for (const nodeId of frontier) {
      Graph.expand(graph, nodeId, 'child');
    }
    await GraphBuilder.flush(builder);

    const nextFrontier: string[] = [];
    for (const nodeId of frontier) {
      for (const child of Graph.getConnections(graph, nodeId, 'child')) {
        if (visited.has(child.id)) {
          continue;
        }
        visited.add(child.id);
        nextFrontier.push(child.id);

        if (builder.getNodeExtensionId(child.id) === extensionId) {
          const lastSegment = child.id.slice(child.id.lastIndexOf('/') + 1);
          if (lastSegment === id) {
            return child.id;
          }
        }
      }
    }

    if (nextFrontier.length === 0) {
      return null;
    }
    frontier = nextFrontier;
  }

  return null;
};

/**
 * Resolve a single `(key, id)` pair to a qualified node id, anchored at the workspace base.
 * Tries the memoized shape first (a candidate id built from the last-learned ancestor template);
 * falls back to a full BFS on a miss, and records the shape it finds for next time.
 */
const resolveKeyId = async (
  builder: GraphBuilder.GraphBuilder,
  workspaceBaseId: string,
  key: string,
  extensionId: string,
  id: string,
): Promise<string | null> => {
  const shapeCache = getShapeCache(builder);
  const template = shapeCache.get(key);

  if (template) {
    const candidateId = [workspaceBaseId, ...template, id].join('/');
    await expandAncestors(builder, candidateId);
    if (Option.isSome(Graph.getNode(builder.graph, candidateId))) {
      return candidateId;
    }
    // Learned shape no longer matches this id; fall through to a full BFS below.
  }

  const found = await bfsResolve(builder, workspaceBaseId, extensionId, id);
  if (found) {
    const relative = found.slice(workspaceBaseId.length + 1).split('/');
    shapeCache.set(key, relative.slice(0, -1));
  }
  return found;
};

/**
 * Resolve a companion (id-less) pair against the node it attaches to: the child of `precedingNodeId`
 * produced by the key-owning extension. A single expand, no BFS — companions are always a direct
 * child of the plank they attach to.
 */
const resolveCompanion = async (
  builder: GraphBuilder.GraphBuilder,
  precedingNodeId: string,
  extensionId: string,
): Promise<string | null> => {
  Graph.expand(builder.graph, precedingNodeId, 'child');
  await GraphBuilder.flush(builder);

  const match = Graph.getConnections(builder.graph, precedingNodeId, 'child').find(
    (child) => builder.getNodeExtensionId(child.id) === extensionId,
  );
  return match?.id ?? null;
};

const resolveUrlAsync = async (
  builder: GraphBuilder.GraphBuilder,
  parsed: { workspace: string; pairs: ReadonlyArray<UrlPair> },
): Promise<Array<ResolvedPair | null>> => {
  const keyTable = buildKeyTable(builder);
  const results: Array<ResolvedPair | null> = [];
  // Tracks the most recently resolved *plank* (id-bearing) node, the anchor for companion pairs —
  // a companion always attaches to the preceding plank, never to another companion.
  let lastPlankNodeId: string | undefined;

  for (let pairIndex = 0; pairIndex < parsed.pairs.length; pairIndex++) {
    const pair = parsed.pairs[pairIndex];
    const extensionId = keyTable.get(pair.key);

    if (!extensionId) {
      log.warn('unknown URL prefix key', { key: pair.key });
      results.push(null);
      if (pair.id !== undefined) {
        lastPlankNodeId = undefined;
      }
      continue;
    }

    if (pair.id === undefined) {
      // Companion pair: attach to the preceding plank, if any.
      const nodeId = lastPlankNodeId ? await resolveCompanion(builder, lastPlankNodeId, extensionId) : null;
      results.push(nodeId ? { pairIndex, nodeId } : null);
      continue;
    }

    const workspaceBaseId = `${Node.RootId}/${pair.workspace}`;
    const nodeId = await resolveKeyId(builder, workspaceBaseId, pair.key, extensionId, pair.id);
    results.push(nodeId ? { pairIndex, nodeId } : null);
    lastPlankNodeId = nodeId ?? undefined;
  }

  return results;
};

/**
 * Resolve a parsed URL's pair chain to graph node ids, walking left to right. Each pair is resolved
 * independently against the graph builder's connectors — no per-extension resolve function exists
 * anywhere; resolution is entirely derived from `urlKey` declarations, node-id structure, and the
 * provenance the builder already tracks (see `GraphBuilder.getNodeExtensionId`).
 *
 * An unknown key, or a key whose extension has no matching node, yields `null` at that index;
 * callers route a `null` to a not-found page. A companion (id-less) pair resolves against the
 * *preceding plank's* node, not the raw preceding pair.
 */
export const resolveUrl = (
  builder: GraphBuilder.GraphBuilder,
  parsed: { workspace: string; pairs: ReadonlyArray<UrlPair> },
): Effect.Effect<Array<ResolvedPair | null>> => Effect.promise(() => resolveUrlAsync(builder, parsed));

/**
 * Reverse-map a graph node id back to its `(key, id?, workspace)` representation, the inverse of
 * `resolveUrl`: the builder already knows which extension's connector produced the node
 * (`getNodeExtensionId`), so the URL key is just that extension's `urlKey`. Returns `Option.none()`
 * for a node with no key-declaring producer (unmapped — serialization skips it with a dev-time warning
 * one layer up, per the design's "unmapped nodes" rule).
 */
export const representNode = (builder: GraphBuilder.GraphBuilder, nodeId: string): Option.Option<RepresentedNode> => {
  const extensionId = builder.getNodeExtensionId(nodeId);
  if (!extensionId) {
    return Option.none();
  }

  const key = builder.getExtensions()[extensionId]?.urlKey;
  if (!key) {
    return Option.none();
  }

  const segments = nodeId.split('/');
  // Canonical node ids are `root/<workspace>/...`; the workspace is always the second segment.
  const workspace = segments[1];
  if (!workspace) {
    return Option.none();
  }

  const lastSegment = segments[segments.length - 1];
  if (lastSegment.startsWith(LINKED_PREFIX)) {
    // A linked (companion) segment carries no user-facing id.
    return Option.some({ key, workspace });
  }

  return Option.some({ key, id: lastSegment, workspace });
};
