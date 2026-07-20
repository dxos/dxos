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

const WORKSPACE_A = 'workspaceA';
const WORKSPACE_B = 'workspaceB';

/**
 * Test graph, two levels deep: root -> workspace (no urlKey, internal plumbing) -> doc (urlKey
 * `doc`) -> comments companion (urlKey `comments`, id-less). A second, later-registered extension
 * also declares `doc` to exercise duplicate-key drop.
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

  // Registered after `docs` with the same urlKey: first registration wins, this one is dropped
  // (with a log.warn) — its nodes exist in the graph but are never reachable via the `doc` key.
  const duplicateDocs = Effect.runSync(
    GraphBuilder.createExtension({
      id: 'duplicateDocs',
      urlKey: 'doc',
      match: NodeMatcher.whenNodeType(WORKSPACE_TYPE),
      connector: () => Effect.succeed([{ id: 'shadowedDoc', type: OTHER_DOC_TYPE }]),
    }),
  );

  GraphBuilder.addExtension(builder, [workspaces, docs, comments, duplicateDocs]);
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

    test('a duplicate-key extension is dropped: its nodes are unreachable via that key', async ({ expect }) => {
      const builder = buildTestBuilder();
      const results = await EffectEx.runPromise(
        PathResolution.resolveUrl(builder, {
          workspace: WORKSPACE_A,
          pairs: [{ key: 'doc', id: 'shadowedDoc', workspace: WORKSPACE_A }],
        }),
      );
      expect(results).toEqual([null]);
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

    test('returns none for a node with no key-declaring producer', async ({ expect }) => {
      const builder = buildTestBuilder();
      const represented = PathResolution.representNode(builder, Node.RootId);
      expect(Option.isNone(represented)).toBe(true);
    });
  });
});
