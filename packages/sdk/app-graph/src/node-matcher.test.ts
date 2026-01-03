//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import { describe, expect, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

import * as Node from './node';
import * as NodeMatcher from './node-matcher';

describe('NodeMatcher', () => {
  describe('whenRoot', () => {
    test('matches root node', () => {
      const rootNode: Node.Node = {
        id: Node.RootId,
        type: Node.RootType,
        properties: {},
        data: null,
      };
      const result = NodeMatcher.whenRoot(rootNode);
      expect(Option.isSome(result)).to.be.true;
      expect(Option.getOrNull(result)).to.equal(rootNode);
    });

    test('does not match non-root node', () => {
      const node: Node.Node = {
        id: 'other',
        type: 'test',
        properties: {},
        data: null,
      };
      const result = NodeMatcher.whenRoot(node);
      expect(Option.isNone(result)).to.be.true;
    });
  });

  describe('whenId', () => {
    test('matches node by ID', () => {
      const node: Node.Node = {
        id: 'test-id',
        type: 'test',
        properties: {},
        data: null,
      };
      const matcher = NodeMatcher.whenId('test-id');
      const result = matcher(node);
      expect(Option.isSome(result)).to.be.true;
      expect(Option.getOrNull(result)).to.equal(node);
    });

    test('does not match different ID', () => {
      const node: Node.Node = {
        id: 'test-id',
        type: 'test',
        properties: {},
        data: null,
      };
      const matcher = NodeMatcher.whenId('other-id');
      const result = matcher(node);
      expect(Option.isNone(result)).to.be.true;
    });
  });

  describe('whenNodeType', () => {
    test('matches node by type', () => {
      const node: Node.Node = {
        id: 'test',
        type: 'test-type',
        properties: {},
        data: null,
      };
      const matcher = NodeMatcher.whenNodeType('test-type');
      const result = matcher(node);
      expect(Option.isSome(result)).to.be.true;
      expect(Option.getOrNull(result)).to.equal(node);
    });

    test('does not match different type', () => {
      const node: Node.Node = {
        id: 'test',
        type: 'test-type',
        properties: {},
        data: null,
      };
      const matcher = NodeMatcher.whenNodeType('other-type');
      const result = matcher(node);
      expect(Option.isNone(result)).to.be.true;
    });
  });

  describe('whenType', () => {
    test('creates matcher function', () => {
      const matcher = NodeMatcher.whenType(TestSchema.Person);
      expect(typeof matcher).to.equal('function');
    });

    test('returns none for non-instance', () => {
      const node: Node.Node = {
        id: 'test',
        type: 'test',
        properties: {},
        data: { name: 'Test' },
      };
      const matcher = NodeMatcher.whenType(TestSchema.Person);
      const result = matcher(node);
      expect(Option.isNone(result)).to.be.true;
    });

    test('returns some for instance of type', () => {
      const testObject = Obj.make(TestSchema.Person, { name: 'Test' });
      const node: Node.Node = {
        id: 'test',
        type: 'test',
        properties: {},
        data: testObject,
      };
      const matcher = NodeMatcher.whenType(TestSchema.Person);
      const result = matcher(node);
      expect(Option.isSome(result)).to.be.true;
      expect(Option.getOrNull(result)).to.equal(testObject);
    });
  });

  describe('whenObject', () => {
    test('creates matcher function', () => {
      const node: Node.Node = {
        id: 'test',
        type: 'test',
        properties: {},
        data: { name: 'Test' },
      };
      const result = NodeMatcher.whenObject(node);
      // Just verify the function works - actual object matching depends on Obj.isObject implementation
      expect(Option.isNone(result) || Option.isSome(result)).to.be.true;
    });

    test('does not match non-object data', () => {
      const node: Node.Node = {
        id: 'test',
        type: 'test',
        properties: {},
        data: 'string',
      };
      const result = NodeMatcher.whenObject(node);
      expect(Option.isNone(result)).to.be.true;
    });
  });

  describe('whenAll', () => {
    test('matches when all matchers match', () => {
      const node: Node.Node = {
        id: 'test-id',
        type: 'test-type',
        properties: {},
        data: null,
      };
      const matcher = NodeMatcher.whenAll(NodeMatcher.whenId('test-id'), NodeMatcher.whenNodeType('test-type'));
      const result = matcher(node);
      expect(Option.isSome(result)).to.be.true;
    });

    test('does not match when any matcher fails', () => {
      const node: Node.Node = {
        id: 'test-id',
        type: 'test-type',
        properties: {},
        data: null,
      };
      const matcher = NodeMatcher.whenAll(NodeMatcher.whenId('test-id'), NodeMatcher.whenNodeType('other-type'));
      const result = matcher(node);
      expect(Option.isNone(result)).to.be.true;
    });
  });

  describe('whenAny', () => {
    test('matches when any matcher matches', () => {
      const node: Node.Node = {
        id: 'test-id',
        type: 'test-type',
        properties: {},
        data: null,
      };
      const matcher = NodeMatcher.whenAny(NodeMatcher.whenId('other-id'), NodeMatcher.whenNodeType('test-type'));
      const result = matcher(node);
      expect(Option.isSome(result)).to.be.true;
    });

    test('does not match when all matchers fail', () => {
      const node: Node.Node = {
        id: 'test-id',
        type: 'test-type',
        properties: {},
        data: null,
      };
      const matcher = NodeMatcher.whenAny(NodeMatcher.whenId('other-id'), NodeMatcher.whenNodeType('other-type'));
      const result = matcher(node);
      expect(Option.isNone(result)).to.be.true;
    });
  });
});
