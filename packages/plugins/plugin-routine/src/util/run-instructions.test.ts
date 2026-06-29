//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { RunInstructions } from '@dxos/assistant-toolkit';
import { URI, Ref } from '@dxos/echo';

import { isRunInstructions, runInstructionsRef } from './run-instructions';

describe('RunInstructions registry reference', () => {
  test('runInstructionsRef targets the RunInstructions registry DXN', ({ expect }) => {
    const ref = runInstructionsRef();
    expect(ref.uri).toBe(RunInstructions.meta.key);
    expect(isRunInstructions(ref)).toBe(true);
  });

  test('isRunInstructions rejects other refs and non-refs', ({ expect }) => {
    expect(isRunInstructions(undefined)).toBe(false);
    expect(isRunInstructions(Ref.fromURI(URI.make('dxn:org.dxos.test.otherOperation')))).toBe(false);
  });
});
