//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Process } from '@dxos/compute';

import { ProcessDefinitionRegistry } from './process-definition-registry';

describe('ProcessDefinitionRegistry', () => {
  it('registers and resolves definitions by key', ({ expect }) => {
    const definition = Process.make({ key: 'test.demo', input: Schema.Void, output: Schema.Void, services: [] }, () =>
      Effect.succeed({
        onSpawn: () => Effect.void,
        onInput: () => Effect.void,
        onAlarm: () => Effect.void,
        onChildEvent: () => Effect.void,
      }),
    );
    const registry = new ProcessDefinitionRegistry();
    registry.register(definition);
    expect(registry.get('test.demo')).toBe(definition);
    expect(registry.get('missing')).toBeUndefined();
    // Idempotent re-register of the same key replaces the entry without throwing.
    registry.register(definition);
    expect(registry.get('test.demo')).toBe(definition);
  });
});
