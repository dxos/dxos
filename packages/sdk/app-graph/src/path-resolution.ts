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

/** The single well-known URL key for every plank companion: `companion/<variant>`, resolved against the
 * preceding plank. Not registered by any extension; mirrored in `UrlPath`'s reserved-key set. */
const COMPANION_KEY = 'companion';

/** Reserved words that can never be registered as a `urlKey`, duplicated from `UrlPath.isReservedKey`
 * (rather than imported) to keep app-graph free of an app-toolkit dependency. */
const RESERVED_URL_KEYS = new Set(['w', 'reset', 'redirect', 'not-found', COMPANION_KEY]);

const isReservedUrlKey = (key: string): boolean =>
  RESERVED_URL_KEYS.has(key) || SpaceId.isValid(key) || EntityId.isValid(key);

/**
 * Ordered `urlKey`-declaring extensions: sorted by Position then insertion order (matching
 * connector-ordering semantics elsewhere in this package), with reserved-word keys dropped (each with
 * a `log.warn`). A single key may legitimately be shared by more than one extension (e.g. plugin-space
 * declares `collection` on both the root-collection children connector and the nested-collection
 * children connector, which together address any object reachable through a space's collection tree),
 * so keys are NOT deduped here — {@link buildKeyTable} groups the sharers under one key and forward
 * resolution matches a node produced by any of them. Shared with {@link buildUrlKeyTable} so the
 * reservation rule is expressed exactly once.
 */
const getKeyedExtensions = (builder: GraphBuilder.GraphBuilder): GraphBuilder.BuilderExtension[] => {
  const extensions = Function.pipe(Record.values(builder.getExtensions()), Array.sortBy(Position.compare));

  const keyed: GraphBuilder.BuilderExtension[] = [];
  for (const extension of extensions) {
    const key = extension.urlKey;
    if (!key) {
      continue;
    }
    if (isReservedUrlKey(key)) {
      log.warn('reserved URL prefix key', { key, extension: extension.id });
      continue;
    }
    keyed.push(extension);
  }
  return keyed;
};

/**
 * Build the global `urlKey -> extensionIds` table from the builder's current extensions. Recomputed
 * on every call — cheap (a synchronous scan of already-registered extensions) and always current, so
 * activating/deactivating plugins can never leave a stale table around. A key maps to the ordered list
 * of every extension that declared it (usually one); forward resolution treats a node produced by any
 * of them as a match for the key.
 */
const buildKeyTable = (builder: GraphBuilder.GraphBuilder): Map<string, string[]> => {
  const table = new Map<string, string[]>();
  for (const extension of getKeyedExtensions(builder)) {
    const key = extension.urlKey!;
    const existing = table.get(key);
    if (existing) {
      existing.push(extension.id);
    } else {
      table.set(key, [extension.id]);
    }
  }
  return table;
};

/**
 * A single registered URL prefix key, in the shape `UrlPath.parse` expects. Kept as a plain
 * structural type here (rather than importing `UrlPath.KeyTableEntry`) because app-graph must not
 * depend on app-toolkit.
 */
export type UrlKeyTableEntry = { key: string; hasId: boolean };

/**
 * Build the `urlKey -> { key, hasId }` table consumed by `UrlPath.parse`, straight from the
 * builder's current `urlKey`/`urlKeyHasId` declarations — the "registration, not parser" property
 * the URL grammar requires. Callers (deck/simple-layout url-handlers) pass this to `UrlPath.parse`
 * to tokenize a pathname into a pair chain.
 */
export const buildUrlKeyTable = (builder: GraphBuilder.GraphBuilder): Map<string, UrlKeyTableEntry> => {
  const table = new Map<string, UrlKeyTableEntry>();
  // The companion key is not registered by any extension; seed it so `UrlPath.parse` tokenizes
  // `companion/<variant>` as an id-bearing pair. Resolution attaches it to the preceding plank.
  table.set(COMPANION_KEY, { key: COMPANION_KEY, hasId: true });
  for (const extension of getKeyedExtensions(builder)) {
    const key = extension.urlKey!;
    const hasId = extension.urlKeyHasId ?? true;
    const existing = table.get(key);
    if (existing && existing.hasId !== hasId) {
      // Extensions that share a key must agree on whether it carries an id — the parse table has one
      // entry per key. A mismatch is a declaration bug; keep the first and warn.
      log.warn('conflicting urlKeyHasId for shared URL prefix key', { key, extension: extension.id });
      continue;
    }
    table.set(key, { key, hasId });
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
  extensionIds: ReadonlySet<string>,
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

        const childExtensionId = builder.getNodeExtensionId(child.id);
        if (childExtensionId && extensionIds.has(childExtensionId)) {
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

/** An extension registered for a URL key: its id (for provenance matching) and optional static path. */
type KeyedExtension = { id: string; urlPath?: string[] };

/**
 * Resolve a single `(key, id)` pair to a qualified node id, anchored at the workspace base. Tries the
 * cheapest deterministic route first and only escalates on a miss:
 *   1. A declared static `urlPath` (fixed-shape extension) — an exact candidate, no search.
 *   2. The memoized runtime shape (a candidate built from the last-learned ancestor template).
 *   3. A guided BFS, recording the shape it finds so subsequent lookups skip straight to step 2.
 */
const resolveKeyId = async (
  builder: GraphBuilder.GraphBuilder,
  workspaceBaseId: string,
  key: string,
  extensions: ReadonlyArray<KeyedExtension>,
  id: string,
): Promise<string | null> => {
  // 1. Deterministic: an extension that declares a static ancestor template gives an exact candidate
  // with no search — the common case (type sections, root-collection children, database objects).
  for (const extension of extensions) {
    if (extension.urlPath) {
      const candidateId = [workspaceBaseId, ...extension.urlPath, id].join('/');
      await expandAncestors(builder, candidateId);
      if (Option.isSome(Graph.getNode(builder.graph, candidateId))) {
        return candidateId;
      }
    }
  }

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

  const extensionIds = new Set(extensions.map((extension) => extension.id));
  const found = await bfsResolve(builder, workspaceBaseId, extensionIds, id);
  if (found) {
    const relative = found.slice(workspaceBaseId.length + 1).split('/');
    shapeCache.set(key, relative.slice(0, -1));
  }
  return found;
};

/**
 * Resolve a `companion/<variant>` pair against the plank it attaches to: the linked-segment child
 * (`<precedingNodeId>/~<variant>`) of `precedingNodeId`. A single expand, no BFS — a companion is
 * always a direct child of the plank it attaches to. Matched by the variant (the `~`-stripped last
 * segment), so it works for every companion regardless of which extension produced it.
 */
const resolveCompanion = async (
  builder: GraphBuilder.GraphBuilder,
  precedingNodeId: string,
  variant: string,
): Promise<string | null> => {
  Graph.expand(builder.graph, precedingNodeId, 'child');
  await GraphBuilder.flush(builder);

  const linkedSegment = `${LINKED_PREFIX}${variant}`;
  const match = Graph.getConnections(builder.graph, precedingNodeId, 'child').find(
    (child) => child.id.slice(child.id.lastIndexOf('/') + 1) === linkedSegment,
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

    if (pair.key === COMPANION_KEY) {
      // Companion pair (`companion/<variant>`): attach to the preceding plank by variant. Not itself a
      // plank, so it does not become the anchor for a following companion.
      const nodeId = lastPlankNodeId && pair.id ? await resolveCompanion(builder, lastPlankNodeId, pair.id) : null;
      results.push(nodeId ? { pairIndex, nodeId } : null);
      continue;
    }

    const extensionIdList = keyTable.get(pair.key);

    if (!extensionIdList || extensionIdList.length === 0) {
      log.warn('unknown URL prefix key', { key: pair.key });
      results.push(null);
      if (pair.id !== undefined) {
        lastPlankNodeId = undefined;
      }
      continue;
    }

    if (pair.id === undefined) {
      // Only the reserved `companion` key is id-less-by-attachment; every other key addresses a plank
      // by id. An id-less non-companion pair is unresolvable.
      log.warn('id-less non-companion URL pair', { key: pair.key });
      results.push(null);
      lastPlankNodeId = undefined;
      continue;
    }

    const workspaceBaseId = `${Node.RootId}/${pair.workspace}`;
    const allExtensions = builder.getExtensions();
    const extensions: KeyedExtension[] = extensionIdList.map((extensionId) => ({
      id: extensionId,
      urlPath: allExtensions[extensionId]?.urlPath,
    }));
    const nodeId = await resolveKeyId(builder, workspaceBaseId, pair.key, extensions, pair.id);
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
 * `resolveUrl`. A companion node (a linked `~<variant>` segment) maps to the generic `companion` key
 * with the variant as its id — independent of any extension declaration, so every companion is
 * addressable. Any other node maps via its producing extension's `urlKey` (`getNodeExtensionId`);
 * a node with no key-declaring producer returns `Option.none()` (unmapped — serialization skips it
 * with a dev-time warning one layer up, per the design's "unmapped nodes" rule).
 */
export const representNode = (builder: GraphBuilder.GraphBuilder, nodeId: string): Option.Option<RepresentedNode> => {
  const segments = nodeId.split('/');
  // Canonical node ids are `root/<workspace>/...`; the workspace is always the second segment.
  const workspace = segments[1];
  if (!workspace) {
    return Option.none();
  }

  const lastSegment = segments[segments.length - 1];
  if (lastSegment.startsWith(LINKED_PREFIX)) {
    // Companion node: keyed generically as `companion`, with the variant (the `~`-stripped segment) as
    // its id — no per-extension `urlKey` required.
    return Option.some({ key: COMPANION_KEY, id: lastSegment.slice(LINKED_PREFIX.length), workspace });
  }

  const extensionId = builder.getNodeExtensionId(nodeId);
  if (!extensionId) {
    return Option.none();
  }
  const key = builder.getExtensions()[extensionId]?.urlKey;
  if (!key) {
    return Option.none();
  }

  return Option.some({ key, id: lastSegment, workspace });
};
