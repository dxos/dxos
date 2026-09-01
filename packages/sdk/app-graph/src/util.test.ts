//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as Node from './AppGraphNode.ts';
import { nodeArgsUnchanged, shallowEqual } from './util.ts';

const node = (overrides: Partial<Node.NodeArg<unknown>> = {}): Node.NodeArg<unknown> => ({
  id: 'node',
  type: 'example',
  data: null,
  properties: { label: 'Node' },
  ...overrides,
});

describe('shallowEqual', () => {
  test('same reference', ({ expect }) => {
    const value = { a: 1 };
    expect(shallowEqual(value, value)).to.be.true;
  });

  test('same own keys with identical values', ({ expect }) => {
    expect(shallowEqual({ a: 1, b: 'x' }, { a: 1, b: 'x' })).to.be.true;
  });

  test('differing key counts', ({ expect }) => {
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).to.be.false;
  });

  test('nested values are compared by reference', ({ expect }) => {
    expect(shallowEqual({ a: { b: 1 } }, { a: { b: 1 } })).to.be.false;
  });

  test('non-objects', ({ expect }) => {
    expect(shallowEqual(1, 1)).to.be.true;
    expect(shallowEqual(1, 2)).to.be.false;
    expect(shallowEqual(null, {})).to.be.false;
  });
});

describe('nodeArgsUnchanged', () => {
  test('structurally identical args', ({ expect }) => {
    expect(nodeArgsUnchanged([node()], [node()])).to.be.true;
  });

  test('differing length, id, type or properties', ({ expect }) => {
    expect(nodeArgsUnchanged([node()], [])).to.be.false;
    expect(nodeArgsUnchanged([node()], [node({ id: 'other' })])).to.be.false;
    expect(nodeArgsUnchanged([node()], [node({ type: 'other' })])).to.be.false;
    expect(nodeArgsUnchanged([node()], [node({ properties: { label: 'Other' } })])).to.be.false;
  });

  test('inline children are compared recursively', ({ expect }) => {
    const withChild = (label: string) => [node({ nodes: [node({ id: 'child', properties: { label } })] })];
    expect(nodeArgsUnchanged(withChild('Child'), withChild('Child'))).to.be.true;
    expect(nodeArgsUnchanged(withChild('Child'), withChild('Other'))).to.be.false;
  });

  test('data is compared shallowly, so a re-created data object reads as changed', ({ expect }) => {
    const shared = { value: 1 };
    expect(nodeArgsUnchanged([node({ data: shared })], [node({ data: shared })])).to.be.true;
    // Same contents, new identity one level down: `shallowEqual` compares own values by reference.
    expect(nodeArgsUnchanged([node({ data: { nested: { value: 1 } } })], [node({ data: { nested: { value: 1 } } })])).to
      .be.false;
  });

  // An action's `data` is its invoke closure, rebuilt inline on every connector run, so action-bearing
  // output can never compare unchanged.
  test('a re-created action closure reads as changed', ({ expect }) => {
    const makeArgs = () => [
      node({ actions: [Node.makeAction({ id: 'delete', data: () => Effect.void, properties: { label: 'Delete' } })] }),
    ];
    expect(nodeArgsUnchanged(makeArgs(), makeArgs())).to.be.false;

    // Holding the closure identity stable is what makes the same args compare unchanged.
    const invoke = () => Effect.void;
    const stable = () => [
      node({ actions: [Node.makeAction({ id: 'delete', data: invoke, properties: { label: 'Delete' } })] }),
    ];
    expect(nodeArgsUnchanged(stable(), stable())).to.be.true;
  });
});
