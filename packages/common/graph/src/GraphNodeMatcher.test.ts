//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { describe, expect, test } from 'vitest';

import * as GraphNode from './GraphNode';
import * as GraphNodeMatcher from './GraphNodeMatcher';

describe('GraphNodeMatcher', () => {
  describe('whenRoot', () => {
    test('matches root node', () => {
      const rootNode: GraphNode.Any = {
        id: GraphNode.RootId,
        type: 'org.dxos.type.graphRoot',
        data: null,
      };
      const result = GraphNodeMatcher.whenRoot(rootNode);
      expect(Option.isSome(result)).to.be.true;
      expect(Option.getOrNull(result)).to.equal(rootNode);
    });

    test('does not match non-root node', () => {
      const node: GraphNode.Any = {
        id: 'other',
        type: 'test',
        data: null,
      };
      const result = GraphNodeMatcher.whenRoot(node);
      expect(Option.isNone(result)).to.be.true;
    });
  });

  describe('whenId', () => {
    test('matches node by ID', () => {
      const node: GraphNode.Any = {
        id: 'test-id',
        type: 'test',
        data: null,
      };
      const matcher = GraphNodeMatcher.whenId('test-id');
      const result = matcher(node);
      expect(Option.isSome(result)).to.be.true;
      expect(Option.getOrNull(result)).to.equal(node);
    });

    test('does not match different ID', () => {
      const node: GraphNode.Any = {
        id: 'test-id',
        type: 'test',
        data: null,
      };
      const matcher = GraphNodeMatcher.whenId('other-id');
      const result = matcher(node);
      expect(Option.isNone(result)).to.be.true;
    });
  });

  describe('whenNodeType', () => {
    test('matches node by type', () => {
      const node: GraphNode.Any = {
        id: 'test',
        type: 'test-type',
        data: null,
      };
      const matcher = GraphNodeMatcher.whenNodeType('test-type');
      const result = matcher(node);
      expect(Option.isSome(result)).to.be.true;
      expect(Option.getOrNull(result)).to.equal(node);
    });

    test('does not match different type', () => {
      const node: GraphNode.Any = {
        id: 'test',
        type: 'test-type',
        data: null,
      };
      const matcher = GraphNodeMatcher.whenNodeType('other-type');
      const result = matcher(node);
      expect(Option.isNone(result)).to.be.true;
    });
  });

  describe('whenAll', () => {
    test('matches when all matchers match', () => {
      const node: GraphNode.Any = {
        id: 'test-id',
        type: 'test-type',
        data: null,
      };
      const matcher = GraphNodeMatcher.whenAll(
        GraphNodeMatcher.whenId('test-id'),
        GraphNodeMatcher.whenNodeType('test-type'),
      );
      const result = matcher(node, get);
      expect(Option.isSome(result)).to.be.true;
    });

    test('does not match when any matcher fails', () => {
      const node: GraphNode.Any = {
        id: 'test-id',
        type: 'test-type',
        data: null,
      };
      const matcher = GraphNodeMatcher.whenAll(
        GraphNodeMatcher.whenId('test-id'),
        GraphNodeMatcher.whenNodeType('other-type'),
      );
      const result = matcher(node, get);
      expect(Option.isNone(result)).to.be.true;
    });
  });

  describe('whenAny', () => {
    test('matches when any matcher matches', () => {
      const node: GraphNode.Any = {
        id: 'test-id',
        type: 'test-type',
        data: null,
      };
      const matcher = GraphNodeMatcher.whenAny(
        GraphNodeMatcher.whenId('other-id'),
        GraphNodeMatcher.whenNodeType('test-type'),
      );
      const result = matcher(node, get);
      expect(Option.isSome(result)).to.be.true;
    });

    test('does not match when all matchers fail', () => {
      const node: GraphNode.Any = {
        id: 'test-id',
        type: 'test-type',
        data: null,
      };
      const matcher = GraphNodeMatcher.whenAny(
        GraphNodeMatcher.whenId('other-id'),
        GraphNodeMatcher.whenNodeType('other-type'),
      );
      const result = matcher(node, get);
      expect(Option.isNone(result)).to.be.true;
    });
  });
});

// Real reactive context for matchers that take `get`. The matchers under test
// inspect only the node, so the context is never read — it satisfies the arity.
const captureContext = (): Atom.AtomContext => Registry.make().get(Atom.make((context): Atom.AtomContext => context));
const get = captureContext();
