//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { Compute, HalveCompute } from '../testing';

import type { UndoMappingRegistration } from './types';
import * as UndoRegistry from './undo-registry';

describe('UndoRegistry', () => {
  test('looks up undo mapping by operation key', ({ expect }) => {
    const undoMapping: UndoMappingRegistration = {
      operation: Compute,
      inverse: HalveCompute,
      deriveContext: (input, output) => ({ value: output.value }),
    };
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
    const undoMapping: UndoMappingRegistration = {
      operation: Compute,
      inverse: HalveCompute,
      deriveContext: (input, output) => ({ value: output.value, originalInput: input.value }),
    };
    const registry = UndoRegistry.make(() => [undoMapping]);

    const result = registry.lookup(Compute);
    const context = result?.deriveContext({ value: 5 }, { value: 10 });
    expect(context).toEqual({ value: 10, originalInput: 5 });
  });
});
