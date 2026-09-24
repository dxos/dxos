//
// Copyright 2026 DXOS.org
//

import * as Array from 'effect/Array';
import type * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Order from 'effect/Order';
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
 * connector-ordering semantics elsewhere in this package), with reserved-word and grammar keys dropped
 * (each with a `log.warn`). A single key may legitimately be shared by more than one extension (e.g. plugin-space
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
  const { anchorKey, linked } = builder.urlGrammar;

  const keyed: UrlKeyedExtension[] = [];
  for (const extension of extensions) {
    if (!isUrlKeyed(extension)) {
      continue;
    }
    if (isReservedUrlKey(extension.meta.key)) {
      log.warn('reserved URL prefix key', { key: extension.meta.key, extension: extension.id });
      continue;
    }
    if (extension.meta.key === linked.key || extension.meta.key === anchorKey) {
      // The grammar's keys are read before any item lookup, so an extension bound to one could never resolve.
      log.warn('URL prefix key is reserved by the grammar', { key: extension.meta.key, extension: extension.id });
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
  const { anchorKey, linked } = builder.urlGrammar;
  if (anchorKey) {
    table.set(anchorKey, { key: anchorKey, hasId: true, anchor: true });
  }
  table.set(linked.key, { key: linked.key, hasId: true, anchor: false });
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
  Graph.expandPath(builder.graph, candidateId);
  await GraphBuilder.flush(builder);
  return Option.isSome(Graph.getNode(builder.graph, candidateId)) ? candidateId : null;
};

/**
 * Resolve a single `(key, id)` pair to a qualified node id, anchored at the workspace base. Resolution
 * is fully explicit — no search. Each binding for the key yields at most one candidate:
 *   1. Without a resolver (the preferred deterministic case), the node its shape addresses by the id
 *      ({@link GraphBuilder.urlCandidate}); a singleton addresses its fixed node.
 *   2. With a {@link GraphBuilder.PathResolver} (recursive/mutable shapes, i.e. nested collections), the
 *      node the resolver locates.
 * Static candidates are tried before resolved ones; an unmatched pair yields `null`.
 */
const resolveKeyId = async (
  builder: GraphBuilder.GraphBuilder,
  workspace: string,
  bindings: ReadonlyArray<GraphBuilder.UrlBinding>,
  id: string | undefined,
  wait?: Duration.Input,
): Promise<{ nodeId?: string; candidateId?: string }> => {
  const { tailSeparator } = builder.urlGrammar;
  const candidateIds = bindings.flatMap((binding) =>
    Option.toArray(GraphBuilder.urlCandidate(binding, workspace, id, tailSeparator)),
  );

  // A defect in a resolver degrades to no candidate rather than crashing resolution.
  const workspaceBaseId = `${GraphNode.RootId}/${workspace}`;
  for (const binding of bindings) {
    if (binding.resolve && id !== undefined && (binding.workspace?.(workspace) ?? true)) {
      const candidateId = await EffectEx.runPromise(
        binding.resolve({ id, workspace, workspaceBaseId }).pipe(Effect.catchDefect(() => Effect.succeed(null))),
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

const resolveLinked = async (
  builder: GraphBuilder.GraphBuilder,
  precedingNodeId: string,
  variant: string,
): Promise<string | null> => {
  const { relation, prefix } = builder.urlGrammar.linked;
  Graph.expandSync(builder.graph, precedingNodeId, relation);
  await GraphBuilder.flush(builder);

  const match = Graph.getConnections(builder.graph, precedingNodeId, relation).find(
    (node) => linkedVariant(prefix, node.id) === variant,
  );
  return match?.id ?? null;
};

const isLinkedId = (prefix: string, id: string): boolean => GraphNode.segmentId(id).startsWith(prefix);

const linkedVariant = (prefix: string, id: string): string => {
  const segment = GraphNode.segmentId(id);
  return segment.startsWith(prefix) ? segment.slice(prefix.length) : segment;
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
    if (pair.key === builder.urlGrammar.linked.key && groups.length > 0) {
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

    const bindings = extensionIdList.flatMap((extensionId) => allExtensions[extensionId]?.meta ?? []);
    return resolveKeyId(builder, pair.workspace, bindings, pair.id, options?.wait?.(pairIndex));
  };

  await Promise.all(
    groups.map(async ([headIndex, ...linkedIndexes]) => {
      const headPair = parsed.pairs[headIndex];
      // A leading linked pair has no item to attach to (groups only start with one when the chain
      // opens with it), so it resolves to nothing rather than against a stale base.
      const head = headPair.key === builder.urlGrammar.linked.key ? null : await resolveItem(headIndex);
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
 * explicit — each binding's shape names its candidate (a resolver locates data-dependent ones); there is
 * no generic search. {@link representNode} is the reverse.
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
 * `resolveUrl`. A linked node (a `<prefix><variant>` segment) maps to the grammar's `linked` key with the
 * variant as its id. Any other node maps through the most specific binding whose shape addresses its id,
 * so the answer is the same whether or not the node is loaded; an id no binding addresses returns
 * `Option.none()`.
 */
export const representNode = (builder: GraphBuilder.GraphBuilder, nodeId: string): Option.Option<RepresentedNode> => {
  // Canonical node ids are `root/<workspace>/...`; the workspace is always the second segment.
  const workspace = nodeId.split(GraphNode.PathSeparator)[1];
  if (!workspace) {
    return Option.none();
  }

  const { linked, tailSeparator } = builder.urlGrammar;
  if (isLinkedId(linked.prefix, nodeId)) {
    return Option.some({ key: linked.key, id: linkedVariant(linked.prefix, nodeId), workspace });
  }

  const matches = getKeyedExtensions(builder).flatMap((extension) =>
    Option.toArray(GraphBuilder.urlRepresentation(nodeId, extension.meta, tailSeparator)).map((represented) => ({
      represented,
      specificity: specificity(extension.meta),
      extension: extension.id,
    })),
  );
  const [best, ...rest] = Array.sortWith(matches, (match) => -match.specificity, Order.Number);
  if (!best) {
    return Option.none();
  }
  const rival = rest.find(
    (match) =>
      match.specificity === best.specificity &&
      (match.represented.key !== best.represented.key || match.represented.id !== best.represented.id),
  );
  if (rival) {
    log.warn('equally specific URL bindings address one node', {
      nodeId,
      extensions: [best.extension, rival.extension],
    });
  }
  return Option.some({ ...best.represented, workspace });
};

/**
 * How narrowly a binding's shape pins its nodes: literal segments count most (a singleton's own segment
 * included), then its `minDepth`, so the deeper of two bindings sharing a path claims its ids.
 */
const specificity = (binding: GraphBuilder.UrlBinding): number =>
  (binding.path.length + (binding.kind === 'singleton' ? 1 : 0)) * MAX_DEPTH_RANK + (binding.minDepth ?? 1);

/** Above any `minDepth` a binding declares, so a literal segment always outranks depth. */
const MAX_DEPTH_RANK = 1_000;
