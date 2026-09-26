//
// Copyright 2026 DXOS.org
//

import { createSandboxManager } from '@carderne/sandbox-runtime';
import * as Effect from 'effect/Effect';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import { Database, Filter, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { SandboxPlugin } from '#plugin';
import { Sandbox, SandboxOperation } from '#types';

import { SANDBOX_BACKEND_ENV } from './services/layer.ts';

const probe = createSandboxManager();
const unavailable = !probe.isSupportedPlatform() || probe.checkDependencies().errors.length > 0;

// Read when the plugin's layer spec is first built, so set before the app starts.
const root = mkdtempSync(join(tmpdir(), 'dx-sandbox-plugin-'));
process.env[SANDBOX_BACKEND_ENV] = 'local';
process.env.DX_SANDBOX_ROOT = root;

describe.skipIf(unavailable)('SandboxPlugin (composer harness, local backend)', () => {
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  test('serves the operations from the contributed layer spec', { timeout: 60_000 }, async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin.make({}), SandboxPlugin()],
    });

    const { defaultSpace } = await EffectEx.runAndForwardErrors(
      initializeIdentity(harness.get(ClientCapabilities.Client)),
    );
    await harness.waitForEvent(ClientEvents.SpacesAvailable);

    await harness.runPromise(
      Effect.gen(function* () {
        yield* Operation.invoke(SandboxOperation.CreateSandbox, { name: 'harness' }, { spaceId: defaultSpace.id });
        const [sandbox] = yield* Database.query(Filter.type(Sandbox.Sandbox)).run;
        expect(sandbox.baseImage).toBe('local');

        const result = yield* Operation.invoke(
          SandboxOperation.Exec,
          { sandbox: Ref.make(sandbox), command: 'echo hello from $WORKSPACE' },
          { spaceId: defaultSpace.id },
        );
        expect(result).toMatchObject({ exitCode: 0, success: true });
        expect(result.stdout).toBe(`hello from ${join(root, sandbox.id, 'workspace')}\n`);
      }).pipe(Effect.provide(ServiceResolver.provide({ space: defaultSpace.id }, Database.Service))),
      { timeout: 30_000 },
    );
  });
});
