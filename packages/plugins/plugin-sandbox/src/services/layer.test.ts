//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Atom from 'effect/reactivity/Atom';
import * as AtomRegistry from 'effect/reactivity/AtomRegistry';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';

import { SandboxCapabilities, SandboxService, type Settings } from '#types';

import { SANDBOX_BACKEND_ENV, layer, layerFromCapabilities } from './layer.ts';

// The EDGE backend only reads the client when a call is made, so a manager without one suffices.
const TestLayer = layer.pipe(
  Layer.provide(Layer.sync(Capability.Service, () => CapabilityManager.make({ registry: AtomRegistry.make() }))),
);

describe('SandboxService layer', () => {
  afterEach(() => {
    delete process.env[SANDBOX_BACKEND_ENV];
  });

  it.effect('runs sandboxes on EDGE by default', () =>
    Effect.gen(function* () {
      const sandboxService = yield* SandboxService.Service;
      expect(sandboxService.kind).toBe('edge');
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('runs sandboxes locally when asked to', () =>
    Effect.gen(function* () {
      process.env[SANDBOX_BACKEND_ENV] = 'local';
      const sandboxService = yield* SandboxService.Service.pipe(Effect.provide(TestLayer));
      expect(sandboxService.kind).toBe('local');
    }),
  );
});

describe('SandboxService layer from capabilities', () => {
  afterEach(() => {
    delete process.env[SANDBOX_BACKEND_ENV];
  });

  const setup = (backend: 'edge' | 'local') => {
    const registry = AtomRegistry.make();
    const manager = CapabilityManager.make({ registry });
    const settings = Atom.make<Settings.Settings>({ backend });
    const launched: string[] = [];
    const launcher: SandboxService.Backend = {
      kind: 'local',
      create: () => Effect.die('unused'),
      exec: (_spaceId, _sandboxId, { command }) =>
        Effect.sync(() => {
          launched.push(command);
          return { stdout: 'from launcher', stderr: '', exitCode: 0, success: true };
        }),
      readFileBytes: () => Effect.die('unused'),
      writeFile: () => Effect.die('unused'),
      listFiles: () => Effect.die('unused'),
      exposePort: () => Effect.die('unused'),
    };
    manager.contribute({ module: 'test', interface: Capabilities.AtomRegistry, implementation: registry });
    manager.contribute({ module: 'test', interface: SandboxCapabilities.Settings, implementation: settings });
    manager.contribute({
      module: 'test',
      interface: SandboxCapabilities.LocalLauncher,
      implementation: { backend: Effect.succeed(launcher) },
    });
    const layer = layerFromCapabilities.pipe(Layer.provide(Layer.succeed(Capability.Service, manager)));
    return { layer, registry, settings, launched };
  };

  it.effect('follows the plugin setting, and a change applies without a restart', () =>
    Effect.gen(function* () {
      const { layer, registry, settings, launched } = setup('edge');
      const sandboxService = yield* SandboxService.Service.pipe(Effect.provide(layer));
      expect(sandboxService.kind).toBe('edge');

      registry.set(settings, { backend: 'local' });
      expect(sandboxService.kind).toBe('local');
      const result = yield* sandboxService.exec('space', 'sandbox', { command: 'echo hi' });
      expect(result.stdout).toBe('from launcher');
      expect(launched).toEqual(['echo hi']);
    }),
  );

  it.effect('lets the environment override the setting', () =>
    Effect.gen(function* () {
      process.env[SANDBOX_BACKEND_ENV] = 'edge';
      const { layer } = setup('local');
      const sandboxService = yield* SandboxService.Service.pipe(Effect.provide(layer));
      expect(sandboxService.kind).toBe('edge');
    }),
  );
});
