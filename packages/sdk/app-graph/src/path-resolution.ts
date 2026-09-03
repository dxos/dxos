//
// Copyright 2026 DXOS.org
//

import * as Array from 'effect/Array';
import type * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Record from 'effect/Record';

import { EffectEx } from '@dxos/effect';
import * as GraphNode from '@dxos/graph/GraphNode';
import { EntityId, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { Position } from '@dxos/util';

import * as Graph from './AppGraph.ts';
import * as GraphBuilder from './AppGraphBuilder.ts';

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
 * no matching node); how an unresolved pair is surfaced is the caller's concern.
 */
export type ResolvedPair = {
  pairIndex: number;
  nodeId: string;
};

/**
 * One pair's outcome. Exactly one of `nodeId`/`candidateId` is set — `candidateId` is the id the node
 * *would* have, so callers can keep addressing an unresolved pair by what it asked for. A pair with
 * no candidate at all (an unknown key) is `null`.
 */
export type PairResolution = {
  pairIndex: number;
  nodeId?: string;
  candidateId?: string;
};

/** The graph-path representation of a node, the reverse of a `UrlPair` (`id` is absent for singleton keys). */
export type RepresentedNode = {
  key: string;
  id?: string;
  workspace: string;
};

/** Reserved words that can never be registered as a `urlKey`, duplicated from `UrlPath.isReservedKey`
 * (rather than imported) to keep app-graph free of an app-toolkit dependency. A key declared by a
 * binding — including the `anchor` and `linked` tiers — is never reserved. */
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
type UrlKeyedExtension = GraphBuilder.BuilderExtension & { meta: GraphBuilder.UrlBinding };

/** Narrows to an extension that declared a URL binding, so callers need no non-null assertion. */
const isUrlKeyed = (extension: GraphBuilder.BuilderExtension): extension is UrlKeyedExtension => !!extension.meta?.key;

const getKeyedExtensions = (builder: GraphBuilder.GraphBuilder): UrlKeyedExtension[] => {
  const extensions = Function.pipe(Record.values(builder.getExtensions()), Array.sortBy(Position.compare));

  const keyed: UrlKeyedExtension[] = [];
  for (const extension of extensions) {
    if (!isUrlKeyed(extension)) {
      continue;
    }
    if (isReservedUrlKey(extension.meta.key)) {
      log.warn('reserved URL prefix key', { key: extension.meta.key, extension: extension.id });
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
    const key = extension.meta.key;
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
 * the URL grammar requires. Callers (the layout url-handler) pass this to `UrlPath.parse`
 * to tokenize a pathname into a pair chain.
 */
export const buildUrlKeyTable = (builder: GraphBuilder.GraphBuilder): Map<string, UrlKeyTableEntry> => {
  const table = new Map<string, UrlKeyTableEntry>();
  // The grammar's fixed tiers are configured on the builder, not declared by any extension: the anchor
  // rebases the chain, and the linked key addresses a `~<variant>` child of the preceding item.
  const { anchorKey, linkedKey } = builder.urlGrammar;
  if (anchorKey) {
    table.set(anchorKey, { key: anchorKey, hasId: true, anchor: true });
  }
  if (linkedKey) {
    table.set(linkedKey, { key: linkedKey, hasId: true, anchor: false });
  }
  for (const extension of getKeyedExtensions(builder)) {
    const key = extension.meta.key;
    // The tokenizer's flat lookup is derived from `kind`: a singleton has no id.
    const hasId = extension.meta.kind !== 'singleton';
    const anchor = false;
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
 * Expand every ancestor prefix of a qualified node id (including the id itself), then flush once.
 * Mirrors `@dxos/app-toolkit`'s `NotFound.expandPath` technique, reimplemented locally so app-graph
 * doesn't depend on app-toolkit.
 */
const expandAncestors = async (builder: GraphBuilder.GraphBuilder, qualifiedId: string): Promise<void> => {
  const segments = qualifiedId.split('/');
  for (let index = 1; index <= segments.length; index++) {
    Graph.expandSync(builder.graph, segments.slice(0, index).join('/'), 'child');
  }
  await GraphBuilder.flush(builder);
};

/** An extension registered for a URL key: its path (static segments or a dynamic resolver). */
type KeyedExtension = { id: string; path: string[] | GraphBuilder.PathResolver };

/**
 * Materialize a candidate qualified node id and confirm it exists: expand its ancestors, then check
 * the node is known. Returns the id on success, `null` otherwise.
 *
 * Expansion only triggers population — the objects behind it load out of band — so on a cold
 * restore the check can run before the node lands and report a false absence. Waiting for a node
 * that has not arrived is the caller's job ({@link resolveKeyId} races one deadline across every
 * candidate), so this stays immediate and a speculative candidate falls through at once.
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
 * Static paths are tried before resolvers; an unmatched pair yields `null`.
 */
const resolveKeyId = async (
  builder: GraphBuilder.GraphBuilder,
  workspaceBaseId: string,
  workspace: string,
  extensions: ReadonlyArray<KeyedExtension>,
  id: string,
  wait?: Duration.Input,
): Promise<{ nodeId?: string; candidateId?: string }> => {
  // 1. Static segments: an exact candidate, no search (type sections, database/inbox objects, etc.).
  const idSegments = id.split(builder.urlGrammar.tailSeparator);
  const candidateIds: string[] = extensions
    .filter((extension) => Array.isArray(extension.path))
    .map((extension) => [workspaceBaseId, ...(extension.path as string[]), ...idSegments].join('/'));

  // 2. Dynamic resolver: the extension computes the candidate id from runtime data (self-contained
  // Effect; a defect degrades to no candidate rather than crashing resolution). Ordered after the
  // static ones, which is the declared precedence.
  for (const extension of extensions) {
    if (typeof extension.path === 'function') {
      const candidateId = await EffectEx.runPromise(
        extension.path({ id, workspace, workspaceBaseId }).pipe(Effect.catchDefect(() => Effect.succeed(null))),
      );
      if (candidateId) {
        candidateIds.push(candidateId);
      }
    }
  }

  // Immediate pass in precedence order, so an already-materialized node still resolves to the
  // first extension that claims it.
  for (const candidateId of candidateIds) {
    const resolved = await materializeCandidate(builder, candidateId);
    if (resolved) {
      return { nodeId: resolved };
    }
  }
  // Highest precedence, so it is the id this pair would have had; reported whether or not the wait
  // below succeeds, so an unresolved pair still names the node it was asking for.
  const candidateId = candidateIds[0];
  if (wait === undefined || candidateIds.length === 0) {
    return { candidateId };
  }

  // One deadline for the pair, raced across every candidate — per-candidate waits run serially, so
  // N key-sharing extensions would multiply the caller's bound by N. Dynamic candidates wait too:
  // they name the recursive shapes (nested collections) whose containers are the slowest to
  // materialize, which is exactly what the wait exists for.
  const waited = await EffectEx.runPromise(
    Effect.raceAll(
      candidateIds.map((candidate) => Graph.waitFor(builder.graph, candidate).pipe(Effect.as(candidate))),
    ).pipe(Effect.timeoutOrElse({ duration: wait, orElse: () => Effect.succeed<string | null>(null) })),
  );
  return waited ? { nodeId: waited } : { candidateId };
};

/**
 * Resolve a linked pair (`<key>/<variant>`) against the item it attaches to: the linked-segment child
 * (`<precedingNodeId>/~<variant>`) of `precedingNodeId`. A single expand, no BFS — a linked node is
 * always a direct child of the item it attaches to. Matched by the variant (the `~`-stripped last
 * segment), so it works regardless of which extension produced the node.
 */
const resolveLinked = async (
  builder: GraphBuilder.GraphBuilder,
  precedingNodeId: string,
  variant: string,
): Promise<string | null> => {
  Graph.expandSync(builder.graph, precedingNodeId, 'child');
  await GraphBuilder.flush(builder);

  const linkedSegment = `${builder.urlGrammar.linkedPrefix}${variant}`;
  const match = Graph.getConnections(builder.graph, precedingNodeId, 'child').find(
    (child) => child.id.slice(child.id.lastIndexOf('/') + 1) === linkedSegment,
  );
  return match?.id ?? null;
};

const resolveUrlAsync = async (
  builder: GraphBuilder.GraphBuilder,
  parsed: { workspace: string; pairs: ReadonlyArray<UrlPair> },
  options?: ResolveUrlOptions,
): Promise<Array<PairResolution | null>> => {
  const keyTable = buildKeyTable(builder);
  const allExtensions = builder.getExtensions();
  const results: Array<PairResolution | null> = parsed.pairs.map(() => null);

  // The chain partitions into `[item, linked*]` groups: a linked pair resolves against the
  // preceding ITEM, and item pairs resolve against the workspace base, so groups are independent.
  // Running them concurrently is what keeps the caller's per-pair deadline a wall-clock bound —
  // resolving serially spends it once per plank, and a multi-plank cold deep link then exceeds the
  // module activation timeout, which disables the plugin rather than degrading to not-found.
  const groups: Array<number[]> = [];
  parsed.pairs.forEach((pair, pairIndex) => {
    if (pair.key === builder.urlGrammar.linkedKey && groups.length > 0) {
      groups[groups.length - 1].push(pairIndex);
    } else {
      groups.push([pairIndex]);
    }
  });

  const resolveItem = async (pairIndex: number): Promise<{ nodeId?: string; candidateId?: string } | null> => {
    const pair = parsed.pairs[pairIndex];
    const extensionIdList = keyTable.get(pair.key);
    if (!extensionIdList || extensionIdList.length === 0) {
      log.warn('unknown URL prefix key', { key: pair.key });
      return null;
    }

    const workspaceBaseId = `${GraphNode.RootId}/${pair.workspace}`;
    const extensions: KeyedExtension[] = [];
    for (const extensionId of extensionIdList) {
      const url = allExtensions[extensionId]?.meta;
      if (url) {
        extensions.push({ id: extensionId, path: url.path });
      }
    }
    // A normal key addresses a node by id; an id-less singleton key (e.g. `home`) addresses a fixed node
    // whose terminal segment IS the key — resolve it the same way with the key standing in for the id
    // (`root/<ws>/<...path>/<key>`).
    return resolveKeyId(
      builder,
      workspaceBaseId,
      pair.workspace,
      extensions,
      pair.id ?? pair.key,
      options?.wait?.(pairIndex),
    );
  };

  await Promise.all(
    groups.map(async ([headIndex, ...linkedIndexes]) => {
      const headPair = parsed.pairs[headIndex];
      // A leading linked pair has no item to attach to (groups only start with one when the chain
      // opens with it), so it resolves to nothing rather than against a stale base.
      const head = headPair.key === builder.urlGrammar.linkedKey ? null : await resolveItem(headIndex);
      const headNodeId = head?.nodeId;
      results[headIndex] = head?.nodeId
        ? { pairIndex: headIndex, nodeId: head.nodeId }
        : head?.candidateId
          ? { pairIndex: headIndex, candidateId: head.candidateId }
          : null;

      // Linked pairs attach to this group's item, and to each other in order.
      let lastItemNodeId = headNodeId;
      for (const pairIndex of linkedIndexes) {
        const pair = parsed.pairs[pairIndex];
        const nodeId = lastItemNodeId && pair.id ? await resolveLinked(builder, lastItemNodeId, pair.id) : null;
        results[pairIndex] = nodeId ? { pairIndex, nodeId } : null;
      }
    }),
  );

  return results;
};

/**
 * Resolve a parsed URL's pair chain to graph node ids, walking left to right. Resolution is fully
 * explicit — each keyed extension declares either a static `urlPath` template (preferred) or a dynamic
 * `resolve` Effect (data-dependent shapes); there is no generic search. Reverse mapping still uses the
 * provenance the builder tracks (see `GraphBuilder.getNodeExtensionId`).
 *
 * An unknown key, or a key whose extension produces no matching node, yields `null` at that index;
 * how a `null` is surfaced is the caller's concern. A linked pair resolves against the *preceding
 * item's* node, not the raw preceding pair.
 */
export type ResolveUrlOptions = {
  /**
   * How long to wait for a pair's candidate node to materialize, by pair index. Per-pair because
   * the answer differs: a pair whose object is known to exist is merely late, while one nothing
   * vouches for is absent and must not hold up the restore. Return `undefined` to read immediately.
   */
  readonly wait?: (pairIndex: number) => Duration.Input | undefined;
};

export const resolveUrl = (
  builder: GraphBuilder.GraphBuilder,
  parsed: { workspace: string; pairs: ReadonlyArray<UrlPair> },
  options?: ResolveUrlOptions,
): Effect.Effect<Array<PairResolution | null>> => Effect.promise(() => resolveUrlAsync(builder, parsed, options));

/**
 * Reverse-map a graph node id back to its `(key, id?, workspace)` representation, the inverse of
 * `resolveUrl`. A linked node (a `~<variant>` segment) maps to the declared `linked` key
 * with the variant as its id — independent of the producing extension, so every linked node is
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
  if (lastSegment.startsWith(builder.urlGrammar.linkedPrefix)) {
    // Linked node: keyed by the grammar's `linked` key, with the variant (the `~`-stripped segment) as
    // its id — matched by the convention, independent of the producing extension.
    const linkedKey = builder.urlGrammar.linkedKey;
    if (linkedKey) {
      return Option.some({ key: linkedKey, id: lastSegment.slice(builder.urlGrammar.linkedPrefix.length), workspace });
    }
  }

  const extensionId = builder.getNodeExtensionId(nodeId);
  if (!extensionId) {
    return Option.none();
  }
  const url = builder.getExtensions()[extensionId]?.meta;
  if (!url) {
    return Option.none();
  }

  // The (key, id?) representation is derived from the node id + binding (a singleton has no id; a
  // resolver-backed key keeps just the object id; a static path `+`-joins the segments after the path) —
  // the same derivation the builder uses to stamp `urlSegment`.
  return Option.some({ ...GraphBuilder.urlRepresentation(nodeId, url, builder.urlGrammar.tailSeparator), workspace });
};
