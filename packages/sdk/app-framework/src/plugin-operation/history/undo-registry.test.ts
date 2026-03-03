//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { Compute, HalveCompute } from '../testing';

import * as UndoMapping from './undo-mapping';
import * as UndoRegistry from './undo-registry';

describe('UndoRegistry', () => {
  test('looks up undo mapping by operation key', ({ expect }) => {
    const undoMapping = UndoMapping.make({
      operation: Compute,
      inverse: HalveCompute,
      deriveContext: (_input, output) => ({ value: output.value }),
    });
    const registry = UndoRegistry.make(() => [undoMapping]);

    const result = registry.lookup(Compute);
    expect(result).not.toBe(undefined);
    expect(result?.inverse.meta.key).toBe('test.halve-compute');
  });

  test('returns undefined for unmapped operations', ({ expect }) => {
    const registry = UndoRegistry.make(() => []);

    const result = registry.lookup(Compute);
    expect(result).toBe(undefined);
  });

  test('deriveContext extracts correct undo input', ({ expect }) => {
    const undoMapping = UndoMapping.make({
      operation: Compute,
      inverse: HalveCompute,
      // Note: This tests that input and output types are inferred correctly.
      deriveContext: (input, output) => ({ value: output.value + input.value }),
    });
    const registry = UndoRegistry.make(() => [undoMapping]);

    const result = registry.lookup(Compute);
    const context = result?.deriveContext({ value: 5 }, { value: 10 });
    expect(context).toEqual({ value: 15 });
  });
});

describe('resolveMessage', () => {
  test('returns undefined for undefined message', ({ expect }) => {
    const result = UndoMapping.resolveMessage(undefined, { value: 1 }, { value: 2 });
    expect(result).toBe(undefined);
  });

  test('returns static label as-is', ({ expect }) => {
    const staticMessage: [string, { ns: string }] = ['test message', { ns: 'test' }];
    const result = UndoMapping.resolveMessage(staticMessage, { value: 1 }, { value: 2 });
    expect(result).toEqual(staticMessage);
  });

  test('calls function message with input and output', ({ expect }) => {
    const messageFunc = (input: { value: number }, output: { value: number }): [string, { ns: string }] => [
      `input: ${input.value}, output: ${output.value}`,
      { ns: 'test' },
    ];
    const result = UndoMapping.resolveMessage(messageFunc, { value: 5 }, { value: 10 });
    expect(result).toEqual(['input: 5, output: 10', { ns: 'test' }]);
  });

  test('returns string label as-is', ({ expect }) => {
    const result = UndoMapping.resolveMessage('simple string', { value: 1 }, { value: 2 });
    expect(result).toBe('simple string');
  });
});
