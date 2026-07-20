//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';

import * as GraphBuilder from './graph-builder';
import * as Node from './node';
import * as NodeMatcher from './node-matcher';
import * as PathResolution from './path-resolution';

const WORKSPACE_TYPE = 'test.workspace';
const DOC_TYPE = 'test.document';
const OTHER_DOC_TYPE = 'test.other-document';
const COMMENTS_TYPE = 'test.comments';
const GROUP_TYPE = 'test.group';
const GROUP_ID = 'group';
const SECTIONED_TYPE = 'test.sectioned';
const INLINE_SECTION_TYPE = 'test.inline-section';
const INLINE_SECTION_ID = 'inlineSection';
const INLINE_DOC_TYPE = 'test.inline-doc';

const WORKSPACE_A = 'workspaceA';
const WORKSPACE_B = 'workspaceB';

/**
 * Test graph, two levels deep: root -> workspace (no urlKey, internal plumbing) -> doc (urlKey
 * `doc`) -> comments companion (urlKey `comments`, id-less). A second, later-registered extension
 * also declares `doc` to exercise a shared key: both extensions' nodes are reachable via `doc`.
 */
const buildTestBuilder = (): GraphBuilder.GraphBuilder => {
  const registry = Registry.make();
  const builder = GraphBuilder.make({ registry });

  const workspaces = Effect.runSync(
    GraphBuilder.createExtension({
      id: 'workspaces',
      match: NodeMatcher.whenNodeType(Node.RootType),
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
      urlKey: 'doc',
      match: NodeMatcher.whenNodeType(WORKSPACE_TYPE),
      connector: (workspaceNode) =>
        Effect.succeed(
          workspaceNode.id === `${Node.RootId}/${WORKSPACE_A}`
            ? [
                { id: 'docA', type: DOC_TYPE },
                { id: 'docB', type: DOC_TYPE },
              ]
            : [{ id: 'docC', type: DOC_TYPE }],
        ),
    }),
  );

  const comments = Effect.runSync(
    GraphBuilder.createExtension({
      id: 'comments',
      urlKey: 'comments',
      match: NodeMatcher.whenNodeType(DOC_TYPE),
      connector: () => Effect.succeed([{ id: '~comments', type: COMMENTS_TYPE }]),
    }),
  );

  // Registered after `docs` with the same urlKey: the key is shared, so this extension's nodes are
  // also reachable via `doc` (forward resolution matches a node produced by any sharer of the key).
  const sharedKeyDocs = Effect.runSync(
    GraphBuilder.createExtension({
      id: 'sharedKeyDocs',
      urlKey: 'doc',
      match: NodeMatcher.whenNodeType(WORKSPACE_TYPE),
      connector: () => Effect.succeed([{ id: 'sharedDoc', type: OTHER_DOC_TYPE }]),
    }),
  );

  // A fixed-shape subtree: a group node under the workspace, with sectioned docs nested beneath it.
  // The sectioned-docs extension declares a static `urlPath` ([GROUP_ID]) so forward resolution can
  // expand the exact path `root/<ws>/group/<id>` deterministically, without a search.
  const group = Effect.runSync(
    GraphBuilder.createExtension({
      id: 'group',
      match: NodeMatcher.whenNodeType(WORKSPACE_TYPE),
      connector: () => Effect.succeed([{ id: GROUP_ID, type: GROUP_TYPE }]),
    }),
  );

  const sectionedDocs = Effect.runSync(
    GraphBuilder.createExtension({
      id: 'sectionedDocs',
      urlKey: 'sectioned',
      urlPath: [GROUP_ID],
      match: NodeMatcher.whenNodeType(GROUP_TYPE),
      connector: () => Effect.succeed([{ id: 'secDocA', type: SECTIONED_TYPE }]),
    }),
  );

  // A section connector that returns its objects as inline children (like TypeSection), rather than as
  // top-level connector nodes. Provenance must still be recorded for the inline children so they carry
  // the extension's urlKey — otherwise they have no URL representation.
  const inlineDocs = Effect.runSync(
    GraphBuilder.createExtension({
      id: 'inlineDocs',
      urlKey: 'inline',
      match: NodeMatcher.whenNodeType(WORKSPACE_TYPE),
      connector: () =>
        Effect.succeed([
          { id: INLINE_SECTION_ID, type: INLINE_SECTION_TYPE, nodes: [{ id: 'inlineDocA', type: INLINE_DOC_TYPE }] },
        ]),
    }),
  );

  GraphBuilder.addExtension(builder, [workspaces, docs, comments, sharedKeyDocs, group, sectionedDocs, inlineDocs]);
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
      expect(results).toEqual([{ pairIndex: 0, nodeId: `${Node.RootId}/${WORKSPACE_A}/docA` }]);
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
        { pairIndex: 0, nodeId: `${Node.RootId}/${WORKSPACE_A}/docA` },
        { pairIndex: 1, nodeId: `${Node.RootId}/${WORKSPACE_A}/docB` },
      ]);
    });

    test('resolves a companion pair attached to the preceding plank', async ({ expect }) => {
      const builder = buildTestBuilder();
      const results = await EffectEx.runPromise(
        PathResolution.resolveUrl(builder, {
          workspace: WORKSPACE_A,
          pairs: [
            { key: 'doc', id: 'docA', workspace: WORKSPACE_A },
            { key: 'comments', workspace: WORKSPACE_A },
          ],
        }),
      );
      expect(results).toEqual([
        { pairIndex: 0, nodeId: `${Node.RootId}/${WORKSPACE_A}/docA` },
        { pairIndex: 1, nodeId: `${Node.RootId}/${WORKSPACE_A}/docA/~comments` },
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
        { pairIndex: 0, nodeId: `${Node.RootId}/${WORKSPACE_A}/docA` },
        { pairIndex: 1, nodeId: `${Node.RootId}/${WORKSPACE_B}/docC` },
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

    test('resolves a nested node via a declared static urlPath template', async ({ expect }) => {
      const builder = buildTestBuilder();
      const results = await EffectEx.runPromise(
        PathResolution.resolveUrl(builder, {
          workspace: WORKSPACE_A,
          pairs: [{ key: 'sectioned', id: 'secDocA', workspace: WORKSPACE_A }],
        }),
      );
      expect(results).toEqual([{ pairIndex: 0, nodeId: `${Node.RootId}/${WORKSPACE_A}/${GROUP_ID}/secDocA` }]);
    });

    test('round-trips a static-urlPath node back to its key/id', async ({ expect }) => {
      const builder = buildTestBuilder();
      const [resolved] = await EffectEx.runPromise(
        PathResolution.resolveUrl(builder, {
          workspace: WORKSPACE_A,
          pairs: [{ key: 'sectioned', id: 'secDocA', workspace: WORKSPACE_A }],
        }),
      );
      invariant(resolved, 'expected the pair to resolve');
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
        { pairIndex: 0, nodeId: `${Node.RootId}/${WORKSPACE_A}/${INLINE_SECTION_ID}/inlineDocA` },
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
      expect(results).toEqual([{ pairIndex: 0, nodeId: `${Node.RootId}/${WORKSPACE_A}/sharedDoc` }]);
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
      invariant(resolved, 'expected the pair to resolve');
      const represented = PathResolution.representNode(builder, resolved.nodeId);
      expect(Option.getOrThrow(represented)).toEqual({ key: 'doc', id: 'docA', workspace: WORKSPACE_A });
    });

    test('round-trips a resolved companion without an id', async ({ expect }) => {
      const builder = buildTestBuilder();
      const results = await EffectEx.runPromise(
        PathResolution.resolveUrl(builder, {
          workspace: WORKSPACE_A,
          pairs: [
            { key: 'doc', id: 'docA', workspace: WORKSPACE_A },
            { key: 'comments', workspace: WORKSPACE_A },
          ],
        }),
      );
      const companion = results[1];
      invariant(companion, 'expected the companion to resolve');
      const represented = PathResolution.representNode(builder, companion.nodeId);
      expect(Option.getOrThrow(represented)).toEqual({ key: 'comments', workspace: WORKSPACE_A });
    });

    test('round-trips an inline child node back to its key/id', async ({ expect }) => {
      const builder = buildTestBuilder();
      const [resolved] = await EffectEx.runPromise(
        PathResolution.resolveUrl(builder, {
          workspace: WORKSPACE_A,
          pairs: [{ key: 'inline', id: 'inlineDocA', workspace: WORKSPACE_A }],
        }),
      );
      invariant(resolved, 'expected the inline child to resolve');
      const represented = PathResolution.representNode(builder, resolved.nodeId);
      expect(Option.getOrThrow(represented)).toEqual({ key: 'inline', id: 'inlineDocA', workspace: WORKSPACE_A });
    });

    test('returns none for a node with no key-declaring producer', async ({ expect }) => {
      const builder = buildTestBuilder();
      const represented = PathResolution.representNode(builder, Node.RootId);
      expect(Option.isNone(represented)).toBe(true);
    });
  });
});
