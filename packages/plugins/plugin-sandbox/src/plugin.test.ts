//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import { configPreset } from '@dxos/config';
import { Database, Filter, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { SandboxPlugin } from '#plugin';
import { Sandbox, SandboxOperation } from '#types';

/**
 * Prereq: sandbox-service worker at http://localhost:8792 (API at /api/sandbox).
 * Entity IDs must be unique per run (do not call `EntityId.dangerouslyDisableRandomness`) so sandbox-service
 * KV does not reject the same sandboxId under a new space from a prior run.
 */
describe('SandboxPlugin (composer harness)', { tags: ['functions-e2e'] }, () => {
  test('creates a sandbox and runs a shell command via operations', { timeout: 60_000 }, async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [
        ClientPlugin.make({
          config: configPreset({ sandbox: 'local' }),
        }),
        SandboxPlugin(),
      ],
    });

    const { defaultSpace } = await EffectEx.runAndForwardErrors(
      initializeIdentity(harness.get(ClientCapabilities.Client)),
    );
    await harness.waitForEvent(ClientEvents.SpacesReady);

    await harness.runPromise(
      Effect.gen(function* () {
        const { sandboxId } = yield* Operation.invoke(
          SandboxOperation.CreateSandbox,
          { name: 'composer-harness-test' },
          { spaceId: defaultSpace.id },
        );
        expect(sandboxId).toBeTruthy();

        const [sandbox] = yield* Database.query(Filter.type(Sandbox.Sandbox)).run;
        expect(sandbox).toBeDefined();

        const result = yield* Operation.invoke(
          SandboxOperation.Exec,
          {
            sandbox: Ref.make(sandbox),
            command: 'echo hello world',
          },
          { spaceId: defaultSpace.id },
        );

        expect(result.exitCode).toBe(0);
        expect(result.success).toBe(true);
        expect(result.stdout.trim()).toBe('hello world');
      }).pipe(Effect.provide(ServiceResolver.provide({ space: defaultSpace.id }, Database.Service))),
      { timeout: 30_000 },
    );
  });
});
