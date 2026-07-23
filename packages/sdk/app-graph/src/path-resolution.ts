//
// Copyright 2026 DXOS.org
//

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Record from 'effect/Record';

import { EffectEx } from '@dxos/effect';
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

/** Reserved words that can never be registered as a `urlKey`, duplicated from `UrlPath.isReservedKey`
 * (rather than imported) to keep app-graph free of an app-toolkit dependency. The workspace (`w`, an
 * `anchor` binding) and companion (`companion`, a `linked` binding) keys are NOT reserved — they are
 * declared bindings (see the workspace-anchor and companion extensions). */
const RESERVED_URL_KEYS = new Set(['reset', 'redirect', 'not-found']);

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
    const key = extension.url?.key;
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
    const key = extension.url!.key;
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
export type UrlKeyTableEntry = { key: string; hasId: boolean; anchor: boolean };

/**
 * Build the `urlKey -> { key, hasId }` table consumed by `UrlPath.parse`, straight from the
 * builder's current `urlKey`/`urlKeyHasId` declarations — the "registration, not parser" property
 * the URL grammar requires. Callers (deck/simple-layout url-handlers) pass this to `UrlPath.parse`
 * to tokenize a pathname into a pair chain.
 */
export const buildUrlKeyTable = (builder: GraphBuilder.GraphBuilder): Map<string, UrlKeyTableEntry> => {
  const table = new Map<string, UrlKeyTableEntry>();
  for (const extension of getKeyedExtensions(builder)) {
    const key = extension.url!.key;
    const kind = extension.url!.kind;
    // The tokenizer's flat lookup is derived from `kind`: a singleton has no id; an anchor rebases.
    const hasId = kind !== 'singleton';
    const anchor = kind === 'anchor';
    const existing = table.get(key);
    if (existing && existing.hasId !== hasId) {
      // Extensions that share a key must agree on their kind — the parse table has one entry per key.
      // A mismatch is a declaration bug; keep the first and warn.
      log.warn('conflicting kind for shared URL prefix key', { key, extension: extension.id });
      continue;
    }
    table.set(key, { key, hasId, anchor });
  }
  return table;
};

/**
 * The single declared workspace-anchor key (`kind: 'anchor'`, conventionally `w`), used by serializers
 * to emit the leading workspace pair. Returns undefined if no anchor extension is registered.
 */
export const getAnchorKey = (builder: GraphBuilder.GraphBuilder): string | undefined =>
  getKeyedExtensions(builder).find((extension) => extension.url?.kind === 'anchor')?.url?.key;

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

/** An extension registered for a URL key: its path (static segments or a dynamic resolver). */
type KeyedExtension = { id: string; path: string[] | GraphBuilder.PathResolver };

/**
 * Materialize a candidate qualified node id and confirm it exists: expand its ancestors, then check
 * the node is known. Returns the id on success, `null` otherwise.
 */
const materializeCandidate = async (
  builder: GraphBuilder.GraphBuilder,
  candidateId: string,
): Promise<string | null> => {
  await expandAncestors(builder, candidateId);
  return Option.isSome(Graph.getNode(builder.graph, candidateId)) ? candidateId : null;
};

/**
 * Resolve a single `(key, id)` pair to a qualified node id, anchored at the workspace base. Resolution
 * is fully explicit — no search. Each keyed extension's `path` is one of:
 *   1. Static segments (`string[]`, the preferred deterministic case): the id is the `+`-joined node
 *      segments *after* the path, so a fixed-depth nested shape (e.g. `db/<slug>+<id>`) resolves with
 *      no resolver — split the id back into segments and expand the exact path.
 *   2. A dynamic {@link GraphBuilder.PathResolver} (recursive/mutable shapes, i.e. nested collections),
 *      whose candidate is materialized and verified the same way.
 * Static paths are tried before resolvers; an unmatched pair yields `null` (routed to a not-found page).
 */
const resolveKeyId = async (
  builder: GraphBuilder.GraphBuilder,
  workspaceBaseId: string,
  workspace: string,
  extensions: ReadonlyArray<KeyedExtension>,
  id: string,
): Promise<string | null> => {
  // 1. Static segments: an exact candidate, no search (type sections, database/inbox objects, etc.).
  const idSegments = id.split(GraphBuilder.TAIL_SEPARATOR);
  for (const extension of extensions) {
    if (Array.isArray(extension.path)) {
      const resolved = await materializeCandidate(
        builder,
        [workspaceBaseId, ...extension.path, ...idSegments].join('/'),
      );
      if (resolved) {
        return resolved;
      }
    }
  }

  // 2. Dynamic resolver: the extension computes the candidate id from runtime data (self-contained
  // Effect; a defect degrades to no candidate rather than crashing resolution).
  for (const extension of extensions) {
    if (typeof extension.path === 'function') {
      const candidateId = await EffectEx.runPromise(
        extension.path({ id, workspace, workspaceBaseId }).pipe(Effect.catchAllDefect(() => Effect.succeed(null))),
      );
      if (candidateId) {
        const resolved = await materializeCandidate(builder, candidateId);
        if (resolved) {
          return resolved;
        }
      }
    }
  }

  return null;
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

  const linkedSegment = `${GraphBuilder.LINKED_PREFIX}${variant}`;
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
  const allExtensions = builder.getExtensions();
  const results: Array<ResolvedPair | null> = [];
  // Tracks the most recently resolved *item* (plank) node, the base for `linked` pairs — a linked pair
  // always attaches to the preceding item, never to another linked pair.
  let lastPlankNodeId: string | undefined;

  for (let pairIndex = 0; pairIndex < parsed.pairs.length; pairIndex++) {
    const pair = parsed.pairs[pairIndex];

    const extensionIdList = keyTable.get(pair.key);
    if (!extensionIdList || extensionIdList.length === 0) {
      log.warn('unknown URL prefix key', { key: pair.key });
      results.push(null);
      if (pair.id !== undefined) {
        lastPlankNodeId = undefined;
      }
      continue;
    }

    // Linked pair (`kind: 'linked'`, e.g. `companion/<variant>`): resolves against the preceding item by
    // variant, not the workspace base — the linked resolution tier. Not itself a plank, so it does not
    // become the base for a following linked pair.
    if (extensionIdList.some((extensionId) => allExtensions[extensionId]?.url?.kind === 'linked')) {
      const nodeId = lastPlankNodeId && pair.id ? await resolveCompanion(builder, lastPlankNodeId, pair.id) : null;
      results.push(nodeId ? { pairIndex, nodeId } : null);
      continue;
    }

    const workspaceBaseId = `${Node.RootId}/${pair.workspace}`;
    const extensions: KeyedExtension[] = [];
    for (const extensionId of extensionIdList) {
      const url = allExtensions[extensionId]?.url;
      if (url && url.kind !== 'linked') {
        extensions.push({ id: extensionId, path: url.path });
      }
    }
    // A normal key addresses a node by id; an id-less singleton key (e.g. `home`) addresses a fixed node
    // whose terminal segment IS the key — resolve it the same way with the key standing in for the id
    // (`root/<ws>/<...path>/<key>`).
    const nodeId = await resolveKeyId(builder, workspaceBaseId, pair.workspace, extensions, pair.id ?? pair.key);
    results.push(nodeId ? { pairIndex, nodeId } : null);
    lastPlankNodeId = nodeId ?? undefined;
  }

  return results;
};

/**
 * Resolve a parsed URL's pair chain to graph node ids, walking left to right. Resolution is fully
 * explicit — each keyed extension declares either a static `urlPath` template (preferred) or a dynamic
 * `resolve` Effect (data-dependent shapes); there is no generic search. Reverse mapping still uses the
 * provenance the builder tracks (see `GraphBuilder.getNodeExtensionId`).
 *
 * An unknown key, or a key whose extension produces no matching node, yields `null` at that index;
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
  if (lastSegment.startsWith(GraphBuilder.LINKED_PREFIX)) {
    // Linked node (e.g. a companion): keyed by the declared `linked` key, with the variant (the
    // `~`-stripped segment) as its id — matched by the convention, independent of the producing extension.
    const linkedKey = GraphBuilder.getLinkedKey(builder);
    if (linkedKey) {
      return Option.some({ key: linkedKey, id: lastSegment.slice(GraphBuilder.LINKED_PREFIX.length), workspace });
    }
  }

  const extensionId = builder.getNodeExtensionId(nodeId);
  if (!extensionId) {
    return Option.none();
  }
  const url = builder.getExtensions()[extensionId]?.url;
  if (!url) {
    return Option.none();
  }

  // The (key, id?) representation is derived from the node id + binding (a singleton has no id; a
  // resolver-backed key keeps just the object id; a static path `+`-joins the segments after the path) —
  // the same derivation the builder uses to stamp `urlSegment`.
  return Option.some({ ...GraphBuilder.urlRepresentation(nodeId, url), workspace });
};
