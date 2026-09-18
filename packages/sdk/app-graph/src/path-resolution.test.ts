//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';
import * as GraphNode from '@dxos/graph/GraphNode';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import { invariant } from '@dxos/invariant';

import * as GraphBuilder from './AppGraphBuilder.ts';
import * as Node from './AppGraphNode.ts';
import * as PathResolution from './path-resolution.ts';

const WORKSPACE_TYPE = 'test.workspace';
const DOC_TYPE = 'test.document';
const OTHER_DOC_TYPE = 'test.other-document';
const COMMENTS_TYPE = 'test.comments';
const GROUP_TYPE = 'test.group';
const GROUP_ID = 'group';
const DYN_GROUP_TYPE = 'test.dyn-group';
const DYN_GROUP_ID = 'dynGroup';
const SECTIONED_TYPE = 'test.sectioned';
const INLINE_SECTION_TYPE = 'test.inline-section';
const INLINE_SECTION_ID = 'inlineSection';
const INLINE_DOC_TYPE = 'test.inline-doc';
const SUBGROUP_TYPE = 'test.subgroup';
const SUBGROUP_ID = 'subgroup';
const NESTED_TYPE = 'test.nested';
const HOME_TYPE = 'test.home';
const HOME_SEGMENT = 'home';

const WORKSPACE_A = 'workspaceA';
const WORKSPACE_B = 'workspaceB';

/**
 * Test graph, two levels deep: root -> workspace (no urlKey, internal plumbing) -> doc (urlKey
 * `doc`) -> comments companion (urlKey `comments`, id-less). A second, later-registered extension
 * also declares `doc` to exercise a shared key: both extensions' nodes are reachable via `doc`.
 */
const COMPANION = Node.relation('companion');

const buildTestBuilder = (): GraphBuilder.GraphBuilder => {
  const registry = Registry.make();
  // The grammar's fixed tiers are builder config, not extensions (see `GraphBuilder.UrlKeys`).
  const builder = GraphBuilder.make({
    registry,
    urlGrammar: { anchorKey: 'w', linked: { key: 'companion', relation: COMPANION } },
  });

  const workspaces = Effect.runSync(
    GraphBuilder.createExtension({
      id: 'workspaces',
      match: GraphNodeMatcher.whenNodeType(Node.RootType),
      connector: () =>
        Effect.succeed([
          { id: WORKSPACE_A, type: WORKSPACE_TYPE },
          { id: WORKSPACE_B, type: WORKSPACE_TYPE },
        ]),
    }),
  );

  const docs = Effect.runSync(
    GraphBuilder.createExtension({
      id: 'docs',
      // Direct children of the workspace base: an empty static template (`root/<ws>/<id>`).
      url: { key: 'doc', kind: 'item', path: [] },
      match: GraphNodeMatcher.whenNodeType(WORKSPACE_TYPE),
      connector: (workspaceNode) =>
        Effect.succeed(
          workspaceNode.id === `${GraphNode.RootId}/${WORKSPACE_A}`
            ? [
                { id: 'docA', type: DOC_TYPE },
                { id: 'docB', type: DOC_TYPE },
              ]
            : [{ id: 'docC', type: DOC_TYPE }],
        ),
    }),
  );

  // A companion of the doc plank. Companions need no `urlKey` — they are addressed generically as
  // `companion/<variant>` (variant = the `~`-stripped segment), resolved against the preceding plank.
  const comments = Effect.runSync(
    GraphBuilder.createExtension({
      id: 'comments',
      relation: COMPANION,
      match: GraphNodeMatcher.whenNodeType(DOC_TYPE),
      connector: () => Effect.succeed([{ id: '~comments', type: COMMENTS_TYPE }]),
    }),
  );

  // Registered after `docs` with the same urlKey: the key is shared, so this extension's nodes are
  // also reachable via `doc` (forward resolution matches a node produced by any sharer of the key).
  const sharedKeyDocs = Effect.runSync(
    GraphBuilder.createExtension({
      id: 'sharedKeyDocs',
      url: { key: 'doc', kind: 'item', path: [] },
      match: GraphNodeMatcher.whenNodeType(WORKSPACE_TYPE),
      connector: () => Effect.succeed([{ id: 'sharedDoc', type: OTHER_DOC_TYPE }]),
    }),
  );

  // A fixed-shape subtree: a group node under the workspace, with sectioned docs nested beneath it.
  // The sectioned-docs extension declares a static `urlPath` ([GROUP_ID]) so forward resolution can
  // expand the exact path `root/<ws>/group/<id>` deterministically, without a search.
  const group = Effect.runSync(
    GraphBuilder.createExtension({
      id: 'group',
      match: GraphNodeMatcher.whenNodeType(WORKSPACE_TYPE),
      connector: () =>
        Effect.succeed([
          { id: GROUP_ID, type: GROUP_TYPE },
          { id: DYN_GROUP_ID, type: DYN_GROUP_TYPE },
        ]),
    }),
  );

  const sectionedDocs = Effect.runSync(
    GraphBuilder.createExtension({
      id: 'sectionedDocs',
      url: { key: 'sectioned', kind: 'item', path: [GROUP_ID] },
      match: GraphNodeMatcher.whenNodeType(GROUP_TYPE),
      connector: () => Effect.succeed([{ id: 'secDocA', type: SECTIONED_TYPE }]),
    }),
  );

  // A section connector that returns its objects as inline children (like TypeSection), rather than as
  // top-level connector nodes.
  const inlineDocs = Effect.runSync(
    GraphBuilder.createExtension({
      id: 'inlineDocs',
      url: { key: 'inline', kind: 'item', path: [INLINE_SECTION_ID] },
      match: GraphNodeMatcher.whenNodeType(WORKSPACE_TYPE),
      connector: () =>
        Effect.succeed([
          { id: INLINE_SECTION_ID, type: INLINE_SECTION_TYPE, nodes: [{ id: 'inlineDocA', type: INLINE_DOC_TYPE }] },
        ]),
    }),
  );

  // A data-dependent shape: forward resolution runs its `resolve` Effect, which computes the candidate
  // node id (here a fixed shape, but in production e.g. a nested collection walked via the database).
  // path-resolution then materializes and verifies the candidate.
  const dynamicDocs = Effect.runSync(
    GraphBuilder.createExtension({
      id: 'dynamicDocs',
      url: {
        key: 'dyn',
        kind: 'item',
        path: [DYN_GROUP_ID],
        resolve: ({ id, workspaceBaseId }) => Effect.succeed(`${workspaceBaseId}/${DYN_GROUP_ID}/${id}`),
      },
      match: GraphNodeMatcher.whenNodeType(DYN_GROUP_TYPE),
      connector: () => Effect.succeed([{ id: 'dynDocA', type: SECTIONED_TYPE }]),
    }),
  );

  // A nested shape (a subgroup under the group, docs under that). The `nested` key declares path
  // `[GROUP_ID]` and a minimum depth of 2, so the remaining segments (`subgroup`, `<id>`) are `+`-encoded
  // into the pair id — a static path with no resolver, exercising the multi-segment tail.
  const subGroup = Effect.runSync(
    GraphBuilder.createExtension({
      id: 'subGroup',
      match: GraphNodeMatcher.whenNodeType(GROUP_TYPE),
      connector: () => Effect.succeed([{ id: SUBGROUP_ID, type: SUBGROUP_TYPE }]),
    }),
  );

  const nestedDocs = Effect.runSync(
    GraphBuilder.createExtension({
      id: 'nestedDocs',
      url: { key: 'nested', kind: 'item', path: [GROUP_ID], minDepth: 2 },
      match: GraphNodeMatcher.whenNodeType(SUBGROUP_TYPE),
      connector: () => Effect.succeed([{ id: 'nestedDocA', type: NESTED_TYPE }]),
    }),
  );

  // An id-less fixed node: `urlKeyHasId: false`, addressed as a bare `home` pair (the key is the
  // terminal segment `root/<ws>/home`).
  const homes = Effect.runSync(
    GraphBuilder.createExtension({
      id: 'homes',
      url: { key: 'home', kind: 'singleton', path: [] },
      match: GraphNodeMatcher.whenNodeType(WORKSPACE_TYPE),
      connector: () => Effect.succeed([{ id: HOME_SEGMENT, type: HOME_TYPE }]),
    }),
  );

  GraphBuilder.addExtension(builder, [
    workspaces,
    docs,
    comments,
    sharedKeyDocs,
    group,
    sectionedDocs,
    inlineDocs,
    dynamicDocs,
    subGroup,
    nestedDocs,
    homes,
  ]);
  return builder;
};

describe('path-resolution', () => {
  describe('resolveUrl', () => {
    test('resolves a single pair', async ({ expect }) => {
      const builder = buildTestBuilder();
      const results = await EffectEx.runPromise(
        PathResolution.resolveUrl(builder, {
          workspace: WORKSPACE_A,
          pairs: [{ key: 'doc', id: 'docA', workspace: WORKSPACE_A }],
        }),
      );
      expect(results).toEqual([{ pairIndex: 0, nodeId: `${GraphNode.RootId}/${WORKSPACE_A}/docA` }]);
    });

    test('resolves a two-pair chain', async ({ expect }) => {
      const builder = buildTestBuilder();
      const results = await EffectEx.runPromise(
        PathResolution.resolveUrl(builder, {
          workspace: WORKSPACE_A,
          pairs: [
            { key: 'doc', id: 'docA', workspace: WORKSPACE_A },
            { key: 'doc', id: 'docB', workspace: WORKSPACE_A },
          ],
        }),
      );
      expect(results).toEqual([
        { pairIndex: 0, nodeId: `${GraphNode.RootId}/${WORKSPACE_A}/docA` },
        { pairIndex: 1, nodeId: `${GraphNode.RootId}/${WORKSPACE_A}/docB` },
      ]);
    });

    test('resolves a companion pair attached to the preceding plank', async ({ expect }) => {
      const builder = buildTestBuilder();
      const results = await EffectEx.runPromise(
        PathResolution.resolveUrl(builder, {
          workspace: WORKSPACE_A,
          pairs: [
            { key: 'doc', id: 'docA', workspace: WORKSPACE_A },
            { key: 'companion', id: 'comments', workspace: WORKSPACE_A },
          ],
        }),
      );
      expect(results).toEqual([
        { pairIndex: 0, nodeId: `${GraphNode.RootId}/${WORKSPACE_A}/docA` },
        { pairIndex: 1, nodeId: `${GraphNode.RootId}/${WORKSPACE_A}/docA/~comments` },
      ]);
    });

    test('resolves a cross-workspace pair', async ({ expect }) => {
      const builder = buildTestBuilder();
      const results = await EffectEx.runPromise(
        PathResolution.resolveUrl(builder, {
          workspace: WORKSPACE_A,
          pairs: [
            { key: 'doc', id: 'docA', workspace: WORKSPACE_A },
            { key: 'doc', id: 'docC', workspace: WORKSPACE_B },
          ],
        }),
      );
      expect(results).toEqual([
        { pairIndex: 0, nodeId: `${GraphNode.RootId}/${WORKSPACE_A}/docA` },
        { pairIndex: 1, nodeId: `${GraphNode.RootId}/${WORKSPACE_B}/docC` },
      ]);
    });

    test('unknown key resolves to null', async ({ expect }) => {
      const builder = buildTestBuilder();
      const results = await EffectEx.runPromise(
        PathResolution.resolveUrl(builder, {
          workspace: WORKSPACE_A,
          pairs: [{ key: 'bogus', id: 'x', workspace: WORKSPACE_A }],
        }),
      );
      expect(results).toEqual([null]);
    });

    // The id a plank keeps when its node never arrives.
    test('a known key with no matching node reports the candidate it attempted', async ({ expect }) => {
      const builder = buildTestBuilder();
      const results = await EffectEx.runPromise(
        PathResolution.resolveUrl(builder, {
          workspace: WORKSPACE_A,
          pairs: [{ key: 'doc', id: 'missingDoc', workspace: WORKSPACE_A }],
        }),
      );
      expect(results).toEqual([{ pairIndex: 0, candidateId: `${GraphNode.RootId}/${WORKSPACE_A}/missingDoc` }]);
    });

    // Leaking it would make every caller disambiguate a field it cannot use.
    test('a resolved pair reports no candidate', async ({ expect }) => {
      const builder = buildTestBuilder();
      const [resolved] = await EffectEx.runPromise(
        PathResolution.resolveUrl(builder, {
          workspace: WORKSPACE_A,
          pairs: [{ key: 'doc', id: 'docA', workspace: WORKSPACE_A }],
        }),
      );
      expect(resolved?.candidateId).toBeUndefined();
    });

    test('resolves a nested node via a declared static urlPath template', async ({ expect }) => {
      const builder = buildTestBuilder();
      const results = await EffectEx.runPromise(
        PathResolution.resolveUrl(builder, {
          workspace: WORKSPACE_A,
          pairs: [{ key: 'sectioned', id: 'secDocA', workspace: WORKSPACE_A }],
        }),
      );
      expect(results).toEqual([{ pairIndex: 0, nodeId: `${GraphNode.RootId}/${WORKSPACE_A}/${GROUP_ID}/secDocA` }]);
    });

    test('round-trips a static-urlPath node back to its key/id', async ({ expect }) => {
      const builder = buildTestBuilder();
      const [resolved] = await EffectEx.runPromise(
        PathResolution.resolveUrl(builder, {
          workspace: WORKSPACE_A,
          pairs: [{ key: 'sectioned', id: 'secDocA', workspace: WORKSPACE_A }],
        }),
      );
      invariant(resolved?.nodeId, 'expected the pair to resolve');
      const represented = PathResolution.representNode(builder, resolved.nodeId);
      expect(Option.getOrThrow(represented)).toEqual({ key: 'sectioned', id: 'secDocA', workspace: WORKSPACE_A });
    });

    test('resolves an inline child node (produced in a parent node’s nodes array)', async ({ expect }) => {
      const builder = buildTestBuilder();
      const results = await EffectEx.runPromise(
        PathResolution.resolveUrl(builder, {
          workspace: WORKSPACE_A,
          pairs: [{ key: 'inline', id: 'inlineDocA', workspace: WORKSPACE_A }],
        }),
      );
      expect(results).toEqual([
        { pairIndex: 0, nodeId: `${GraphNode.RootId}/${WORKSPACE_A}/${INLINE_SECTION_ID}/inlineDocA` },
      ]);
    });

    test('resolves a nested node via a `+`-encoded tail id', async ({ expect }) => {
      const builder = buildTestBuilder();
      const results = await EffectEx.runPromise(
        PathResolution.resolveUrl(builder, {
          workspace: WORKSPACE_A,
          pairs: [{ key: 'nested', id: `${SUBGROUP_ID}+nestedDocA`, workspace: WORKSPACE_A }],
        }),
      );
      expect(results).toEqual([
        { pairIndex: 0, nodeId: `${GraphNode.RootId}/${WORKSPACE_A}/${GROUP_ID}/${SUBGROUP_ID}/nestedDocA` },
      ]);
    });

    test('round-trips a `+`-encoded tail node back to its key/id', async ({ expect }) => {
      const builder = buildTestBuilder();
      const [resolved] = await EffectEx.runPromise(
        PathResolution.resolveUrl(builder, {
          workspace: WORKSPACE_A,
          pairs: [{ key: 'nested', id: `${SUBGROUP_ID}+nestedDocA`, workspace: WORKSPACE_A }],
        }),
      );
      invariant(resolved?.nodeId, 'expected the pair to resolve');
      const represented = PathResolution.representNode(builder, resolved.nodeId);
      expect(Option.getOrThrow(represented)).toEqual({
        key: 'nested',
        id: `${SUBGROUP_ID}+nestedDocA`,
        workspace: WORKSPACE_A,
      });
    });

    test('resolves an id-less fixed node (urlKeyHasId: false)', async ({ expect }) => {
      const builder = buildTestBuilder();
      const results = await EffectEx.runPromise(
        PathResolution.resolveUrl(builder, {
          workspace: WORKSPACE_A,
          pairs: [{ key: 'home', workspace: WORKSPACE_A }],
        }),
      );
      expect(results).toEqual([{ pairIndex: 0, nodeId: `${GraphNode.RootId}/${WORKSPACE_A}/${HOME_SEGMENT}` }]);
    });

    test('round-trips an id-less fixed node to a bare (id-less) pair', async ({ expect }) => {
      const builder = buildTestBuilder();
      const [resolved] = await EffectEx.runPromise(
        PathResolution.resolveUrl(builder, {
          workspace: WORKSPACE_A,
          pairs: [{ key: 'home', workspace: WORKSPACE_A }],
        }),
      );
      invariant(resolved?.nodeId, 'expected the id-less pair to resolve');
      const represented = PathResolution.representNode(builder, resolved.nodeId);
      expect(Option.getOrThrow(represented)).toEqual({ key: 'home', workspace: WORKSPACE_A });
    });

    test('resolves a data-dependent node via a declared resolve Effect', async ({ expect }) => {
      const builder = buildTestBuilder();
      const results = await EffectEx.runPromise(
        PathResolution.resolveUrl(builder, {
          workspace: WORKSPACE_A,
          pairs: [{ key: 'dyn', id: 'dynDocA', workspace: WORKSPACE_A }],
        }),
      );
      expect(results).toEqual([{ pairIndex: 0, nodeId: `${GraphNode.RootId}/${WORKSPACE_A}/${DYN_GROUP_ID}/dynDocA` }]);
    });

    test('a resolver candidate that does not exist does not resolve', async ({ expect }) => {
      const builder = buildTestBuilder();
      const results = await EffectEx.runPromise(
        PathResolution.resolveUrl(builder, {
          workspace: WORKSPACE_A,
          pairs: [{ key: 'dyn', id: 'missing', workspace: WORKSPACE_A }],
        }),
      );
      expect(results).toEqual([
        { pairIndex: 0, candidateId: `${GraphNode.RootId}/${WORKSPACE_A}/${DYN_GROUP_ID}/missing` },
      ]);
    });

    test('a key shared by two extensions resolves nodes produced by either', async ({ expect }) => {
      const builder = buildTestBuilder();
      const results = await EffectEx.runPromise(
        PathResolution.resolveUrl(builder, {
          workspace: WORKSPACE_A,
          pairs: [{ key: 'doc', id: 'sharedDoc', workspace: WORKSPACE_A }],
        }),
      );
      expect(results).toEqual([{ pairIndex: 0, nodeId: `${GraphNode.RootId}/${WORKSPACE_A}/sharedDoc` }]);
    });

    test('a shared key spends one deadline, not one per extension', async ({ expect }) => {
      // Two extensions declare `doc`, and neither candidate exists. Waiting per candidate would
      // spend the deadline twice over, so the caller's bound would scale with how many extensions
      // happen to share the key.
      const builder = buildTestBuilder();
      const started = Date.now();
      const results = await EffectEx.runPromise(
        PathResolution.resolveUrl(
          builder,
          { workspace: WORKSPACE_A, pairs: [{ key: 'doc', id: 'neverArrives', workspace: WORKSPACE_A }] },
          { wait: () => '200 millis' },
        ),
      );
      expect(results).toEqual([{ pairIndex: 0, candidateId: `${GraphNode.RootId}/${WORKSPACE_A}/neverArrives` }]);
      expect(Date.now() - started).toBeLessThan(400);
    });

    test('a resolver candidate waits for the deadline like a static one', async ({ expect }) => {
      // Dynamic resolvers name the recursive shapes (nested collections) whose containers are the
      // slowest to materialize, so they need the wait at least as much as static paths do — they
      // used to get none, and a cold deep link into one landed on not-found.
      const builder = buildTestBuilder();
      const started = Date.now();
      const results = await EffectEx.runPromise(
        PathResolution.resolveUrl(
          builder,
          { workspace: WORKSPACE_A, pairs: [{ key: 'dyn', id: 'missing', workspace: WORKSPACE_A }] },
          { wait: () => '200 millis' },
        ),
      );
      expect(results).toEqual([
        { pairIndex: 0, candidateId: `${GraphNode.RootId}/${WORKSPACE_A}/${DYN_GROUP_ID}/missing` },
      ]);
      expect(Date.now() - started).toBeGreaterThanOrEqual(150);
    });
  });

  describe('representNode', () => {
    test('round-trips a resolved plank', async ({ expect }) => {
      const builder = buildTestBuilder();
      const [resolved] = await EffectEx.runPromise(
        PathResolution.resolveUrl(builder, {
          workspace: WORKSPACE_A,
          pairs: [{ key: 'doc', id: 'docA', workspace: WORKSPACE_A }],
        }),
      );
      invariant(resolved?.nodeId, 'expected the pair to resolve');
      const represented = PathResolution.representNode(builder, resolved.nodeId);
      expect(Option.getOrThrow(represented)).toEqual({ key: 'doc', id: 'docA', workspace: WORKSPACE_A });
    });

    test('round-trips a resolved companion as companion/<variant>', async ({ expect }) => {
      const builder = buildTestBuilder();
      const results = await EffectEx.runPromise(
        PathResolution.resolveUrl(builder, {
          workspace: WORKSPACE_A,
          pairs: [
            { key: 'doc', id: 'docA', workspace: WORKSPACE_A },
            { key: 'companion', id: 'comments', workspace: WORKSPACE_A },
          ],
        }),
      );
      const companion = results[1];
      invariant(companion?.nodeId, 'expected the companion to resolve');
      const represented = PathResolution.representNode(builder, companion.nodeId);
      expect(Option.getOrThrow(represented)).toEqual({ key: 'companion', id: 'comments', workspace: WORKSPACE_A });
    });

    test('round-trips an inline child node back to its key/id', async ({ expect }) => {
      const builder = buildTestBuilder();
      const [resolved] = await EffectEx.runPromise(
        PathResolution.resolveUrl(builder, {
          workspace: WORKSPACE_A,
          pairs: [{ key: 'inline', id: 'inlineDocA', workspace: WORKSPACE_A }],
        }),
      );
      invariant(resolved?.nodeId, 'expected the inline child to resolve');
      const represented = PathResolution.representNode(builder, resolved.nodeId);
      expect(Option.getOrThrow(represented)).toEqual({ key: 'inline', id: 'inlineDocA', workspace: WORKSPACE_A });
    });

    test("maps a linked node by the grammar's prefix, and defaults it", ({ expect }) => {
      const custom = GraphBuilder.make({ urlGrammar: { linked: { prefix: '^' } } });
      expect(Option.getOrThrow(PathResolution.representNode(custom, `root/${WORKSPACE_A}/docA/^notes`))).toEqual({
        key: 'linked',
        id: 'notes',
        workspace: WORKSPACE_A,
      });
      expect(Option.isNone(PathResolution.representNode(custom, `root/${WORKSPACE_A}/docA/~notes`))).toBe(true);
    });

    test('rejects an empty linked prefix or tail separator', ({ expect }) => {
      expect(() => GraphBuilder.make({ urlGrammar: { linked: { prefix: '' } } })).toThrow();
      expect(() => GraphBuilder.make({ urlGrammar: { tailSeparator: '' } })).toThrow();
    });

    test('returns none for a node with no key-declaring producer', async ({ expect }) => {
      const builder = buildTestBuilder();
      const represented = PathResolution.representNode(builder, GraphNode.RootId);
      expect(Option.isNone(represented)).toBe(true);
    });
  });

  describe('workspace anchor', () => {
    test('buildUrlKeyTable marks the anchor key and keeps leaf keys', ({ expect }) => {
      const builder = buildTestBuilder();
      const table = PathResolution.buildUrlKeyTable(builder);
      expect(table.get('w')).toEqual({ key: 'w', hasId: true, anchor: true });
      expect(table.get('doc')).toEqual({ key: 'doc', hasId: true, anchor: false });
      expect(table.get('home')).toEqual({ key: 'home', hasId: false, anchor: false });
    });
  });

  describe('representNode', () => {
    const representAfterResolve = async (pairs: ReadonlyArray<PathResolution.UrlPair>, nodeId: string) => {
      const builder = buildTestBuilder();
      await EffectEx.runPromise(PathResolution.resolveUrl(builder, { workspace: WORKSPACE_A, pairs }));
      return { builder, represented: PathResolution.representNode(builder, nodeId) };
    };

    test('maps a materialized item node back to its pair', async ({ expect }) => {
      const { represented } = await representAfterResolve(
        [{ key: 'doc', id: 'docA', workspace: WORKSPACE_A }],
        `${GraphNode.RootId}/${WORKSPACE_A}/docA`,
      );
      expect(Option.getOrThrow(represented)).toEqual({ key: 'doc', id: 'docA', workspace: WORKSPACE_A });
    });

    test('maps a materialized singleton node back to its keyless pair', async ({ expect }) => {
      const { represented } = await representAfterResolve(
        [{ key: 'home', workspace: WORKSPACE_A }],
        `${GraphNode.RootId}/${WORKSPACE_A}/${HOME_SEGMENT}`,
      );
      expect(Option.getOrThrow(represented)).toEqual({ key: 'home', workspace: WORKSPACE_A });
    });

    test('maps a linked node by the grammar rather than by its producing extension', async ({ expect }) => {
      const builder = buildTestBuilder();
      await EffectEx.runPromise(
        PathResolution.resolveUrl(builder, {
          workspace: WORKSPACE_A,
          pairs: [
            { key: 'doc', id: 'docA', workspace: WORKSPACE_A },
            { key: 'companion', id: 'comments', workspace: WORKSPACE_A },
          ],
        }),
      );
      const represented = PathResolution.representNode(builder, `${GraphNode.RootId}/${WORKSPACE_A}/docA/~comments`);
      expect(Option.getOrThrow(represented)).toEqual({ key: 'companion', id: 'comments', workspace: WORKSPACE_A });
    });

    test('maps a companion whose node is not loaded', ({ expect }) => {
      const represented = PathResolution.representNode(
        buildTestBuilder(),
        `${GraphNode.RootId}/${WORKSPACE_A}/docA/~comments`,
      );
      expect(Option.getOrThrow(represented)).toEqual({ key: 'companion', id: 'comments', workspace: WORKSPACE_A });
    });

    // The counterpart of `nodeUrlSegment` returning undefined: a node sitting exactly at its binding's
    // path is the container the items hang off, so it addresses nothing of its own.
    test("a container at the binding's own path is unmapped", async ({ expect }) => {
      const registry = Registry.make();
      const builder = GraphBuilder.make({
        registry,
        urlGrammar: { anchorKey: 'w', linked: { key: 'companion', relation: COMPANION } },
      });
      GraphBuilder.addExtension(builder, [
        Effect.runSync(
          GraphBuilder.createExtension({
            id: 'workspaces',
            match: GraphNodeMatcher.whenNodeType(Node.RootType),
            connector: () => Effect.succeed([{ id: WORKSPACE_A, type: WORKSPACE_TYPE }]),
          }),
        ),
        Effect.runSync(
          GraphBuilder.createExtension({
            id: 'section',
            // The binding's path IS this node, so there is nothing left to make an id from.
            url: { key: 'doc', kind: 'item', path: [GROUP_ID] },
            match: GraphNodeMatcher.whenNodeType(WORKSPACE_TYPE),
            connector: () => Effect.succeed([{ id: GROUP_ID, type: GROUP_TYPE }]),
          }),
        ),
      ]);
      // Resolution walks the workspace, which is what builds the container node in the first place.
      await EffectEx.runPromise(
        PathResolution.resolveUrl(builder, {
          workspace: WORKSPACE_A,
          pairs: [{ key: 'doc', id: 'anything', workspace: WORKSPACE_A }],
        }),
      );

      const represented = PathResolution.representNode(builder, `${GraphNode.RootId}/${WORKSPACE_A}/${GROUP_ID}`);
      expect(Option.isNone(represented)).toBe(true);
    });

    test.for([
      ['a root-level item', `${WORKSPACE_A}/docA`],
      ['an item from a second extension sharing the key', `${WORKSPACE_A}/sharedDoc`],
      ['an item under a static path', `${WORKSPACE_A}/${GROUP_ID}/secDocA`],
      ['an inline child', `${WORKSPACE_A}/${INLINE_SECTION_ID}/inlineDocA`],
      ['a resolver item', `${WORKSPACE_A}/${DYN_GROUP_ID}/dynDocA`],
      ['a multi-segment tail', `${WORKSPACE_A}/${GROUP_ID}/${SUBGROUP_ID}/nestedDocA`],
      ['a singleton', `${WORKSPACE_A}/${HOME_SEGMENT}`],
    ])('%s round-trips without being loaded first', async ([, path], { expect }) => {
      const builder = buildTestBuilder();
      const nodeId = `${GraphNode.RootId}/${path}`;
      const { workspace, ...pair } = Option.getOrThrow(PathResolution.representNode(builder, nodeId));
      const [resolved] = await EffectEx.runPromise(
        PathResolution.resolveUrl(builder, { workspace, pairs: [{ ...pair, workspace }] }),
      );
      expect(resolved?.nodeId).toBe(nodeId);
    });

    test('encodes a multi-segment tail back into one `+`-joined id', async ({ expect }) => {
      const builder = buildTestBuilder();
      const id = `${SUBGROUP_ID}${builder.urlGrammar.tailSeparator}nestedDocA`;
      await EffectEx.runPromise(
        PathResolution.resolveUrl(builder, {
          workspace: WORKSPACE_A,
          pairs: [{ key: 'nested', id, workspace: WORKSPACE_A }],
        }),
      );
      const represented = PathResolution.representNode(
        builder,
        `${GraphNode.RootId}/${WORKSPACE_A}/${GROUP_ID}/${SUBGROUP_ID}/nestedDocA`,
      );
      expect(Option.getOrThrow(represented)).toEqual({ key: 'nested', id, workspace: WORKSPACE_A });
    });
  });
  describe('binding shapes', () => {
    const url = (binding: GraphBuilder.UrlBinding) =>
      Effect.runSync(
        GraphBuilder.createExtension({ id: `${binding.key}Binding`, url: binding, match: () => Option.none() }),
      );

    const shapesBuilder = () => {
      const builder = GraphBuilder.make({ registry: Registry.make() });
      GraphBuilder.addExtension(builder, [
        url({ key: 'entry', kind: 'item', path: [], workspace: (workspace) => workspace === 'fixed' }),
        url({ key: 'library', kind: 'singleton', path: ['content'] }),
        url({ key: 'linked', kind: 'item', path: ['bound'] }),
        url({ key: 'thread', kind: 'item', path: ['threads'] }),
        url({ key: 'type', kind: 'item', path: ['database'] }),
        url({ key: 'db', kind: 'item', path: ['database'], minDepth: 2 }),
        url({ key: 'feed', kind: 'item', path: ['feeds'] }),
        url({ key: 'post', kind: 'item', path: ['feeds'], minDepth: 2 }),
        url({ key: 'pin', kind: 'item', path: ['feeds'], minDepth: 3 }),
      ]);
      return builder;
    };

    const represent = (nodeId: string) =>
      Option.getOrUndefined(PathResolution.representNode(shapesBuilder(), `${GraphNode.RootId}/${nodeId}`));

    test('a workspace-scoped binding claims only its workspace', ({ expect }) => {
      expect(represent('fixed/org.dxos.plugin.deck')).toEqual({
        key: 'entry',
        id: 'org.dxos.plugin.deck',
        workspace: 'fixed',
      });
      expect(represent('space/org.dxos.plugin.deck')).toBeUndefined();
    });

    test('a binding keyed by the grammar addresses nothing', ({ expect }) => {
      expect(represent('space/bound/docA')).toBeUndefined();
    });

    test('a singleton is its key below its path', ({ expect }) => {
      expect(represent('space/content/library')).toEqual({ key: 'library', workspace: 'space' });
      expect(represent('space/content/books')).toBeUndefined();
    });

    test('a minimum depth separates keys that share a path, and admits deeper tails', ({ expect }) => {
      expect(represent('space/database/org.dxos.type.document')).toEqual({
        key: 'type',
        id: 'org.dxos.type.document',
        workspace: 'space',
      });
      expect(represent('space/database/org.dxos.type.mailbox/mbx/msg')).toEqual({
        key: 'db',
        id: 'org.dxos.type.mailbox+mbx+msg',
        workspace: 'space',
      });
      expect(represent('space/threads/t1/replies/r1')).toEqual({
        key: 'thread',
        id: 't1+replies+r1',
        workspace: 'space',
      });
    });

    test('the larger minimum depth wins', ({ expect }) => {
      expect(represent('space/feeds/f1')?.key).toBe('feed');
      expect(represent('space/feeds/f1/p1')?.key).toBe('post');
      expect(represent('space/feeds/f1/p1/r1')?.key).toBe('pin');
    });

    test('a node its bindings do not shape has no URL', ({ expect }) => {
      expect(represent('space/database')).toBeUndefined();
      expect(represent('space/elsewhere/x')).toBeUndefined();
    });

    test('forward resolution only proposes ids the binding would give back', ({ expect }) => {
      const binding = (key: string) =>
        Object.values(shapesBuilder().getExtensions()).flatMap((extension) =>
          extension.meta?.key === key ? [extension.meta] : [],
        )[0];
      expect(Option.getOrUndefined(GraphBuilder.urlCandidate(binding('type'), 'space', 'org.dxos.type.document'))).toBe(
        'root/space/database/org.dxos.type.document',
      );
      expect(Option.isNone(GraphBuilder.urlCandidate(binding('entry'), 'space', 'org.dxos.plugin.deck'))).toBe(true);
    });
  });
});
