//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Stream from 'effect/Stream';
import { afterEach, assert, describe, test } from 'vitest';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as EffectEx from '@dxos/effect/EffectEx';
import { DXN } from '@dxos/keys';

import { Settings, Summarizer } from '../contracts/index.ts';
import { fakeGateway } from '../hosts/gateway.ts';
import SettingsPlugin, { MAX_SETTINGS, MAX_VALUE_LENGTH } from '../plugins/settings-plugin.ts';
import SummarizerPlugin from '../plugins/summarizer-plugin.ts';
import { type HostControl, Service, ServiceHost, State } from './index.ts';

/** A plugin whose provider fails as it starts, as the settings provider would on unreadable storage. */
const BrokenPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.stories.services.plugin.broken'), name: 'Broken' }),
).pipe(
  Plugin.addModule({
    id: 'provider',
    provides: [ServiceHost.Provider],
    activatesOn: ActivationEvents.Startup,
    activate: () =>
      Effect.succeed([
        Capability.contribute(
          ServiceHost.Provider,
          Service.provide(Settings.Contract, {
            needs: [Settings.STORAGE_FEATURE],
            make: () => Effect.die(new Error('cannot start')),
          }),
        ),
      ]),
  }),
  Plugin.make,
);

/** A plugin whose `Settings` values stream ends as `changes` says: by a failed call, or by a defect. */
const faultySettingsPlugin = (key: string, changes: Settings.Client['values']['changes']) =>
  Plugin.define(Plugin.makeMeta({ key: DXN.make(key), name: 'FaultySettings' })).pipe(
    Plugin.addModule({
      id: 'provider',
      provides: [ServiceHost.Provider],
      activatesOn: ActivationEvents.Startup,
      activate: () =>
        Effect.succeed([
          Capability.contribute(
            ServiceHost.Provider,
            Service.provide(Settings.Contract, {
              make: () =>
                Effect.sync(() => {
                  const settings: Settings.Client = {
                    set: (setting) => Effect.succeed(setting),
                    get: () => Effect.succeed(null),
                    reset: () => Effect.void,
                    values: { get: Effect.succeed({}), changes },
                    changed: State.emitter<Settings.Setting>().stream,
                  };
                  return settings;
                }),
            }),
          ),
        ]),
    }),
    Plugin.make,
  );

/**
 * A plugin whose values stream fails with a call error, and a promise that resolves when a consumer
 * has subscribed to it, which is when it fails.
 */
const failingSettings = () => {
  const { promise: failed, resolve } = Promise.withResolvers<void>();
  const plugin = faultySettingsPlugin(
    'org.dxos.stories.services.plugin.failingSettings',
    Stream.suspend(() => {
      resolve();
      return Stream.fail(new Service.CallError({ context: { key: Settings.Contract.key, member: 'values' } }));
    }),
  );
  return { plugin, failed };
};

const DyingSettingsPlugin = faultySettingsPlugin(
  'org.dxos.stories.services.plugin.dyingSettings',
  Stream.die(new Error('provider defect')),
);

/** What the second provider reports, which no storage in these tests holds. */
const OTHER_VALUES: Settings.Values = { source: 'other' };

/** A second plugin that provides `Settings`, with values of its own. */
const OtherSettingsPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.stories.services.plugin.otherSettings'), name: 'OtherSettings' }),
).pipe(
  Plugin.addModule({
    id: 'provider',
    provides: [ServiceHost.Provider],
    activatesOn: ActivationEvents.Startup,
    activate: () =>
      Effect.succeed([
        Capability.contribute(
          ServiceHost.Provider,
          Service.provide(Settings.Contract, {
            make: () =>
              Effect.sync(() => {
                const values = State.cell(OTHER_VALUES);
                const settings: Settings.Client = {
                  set: (setting) => Effect.succeed(setting),
                  get: () => Effect.succeed(null),
                  reset: () => Effect.void,
                  values: values.property,
                  changed: State.emitter<Settings.Setting>().stream,
                };
                return settings;
              }),
          }),
        ),
      ]),
  }),
  Plugin.make,
);

const PLUGINS: Record<string, () => Plugin.Plugin> = {
  settings: SettingsPlugin,
  summarizer: SummarizerPlugin,
  broken: BrokenPlugin,
  otherSettings: OtherSettingsPlugin,
  dyingSettings: DyingSettingsPlugin,
};

/** Loads from `PLUGINS`, and from `extra` for a plugin one test builds for itself. */
const loader =
  (extra: Record<string, () => Plugin.Plugin> = {}) =>
  async (reference: string): Promise<Plugin.Plugin> => {
    const plugin = extra[reference] ?? PLUGINS[reference];
    if (!plugin) {
      throw new Error(`unknown plugin: ${reference}`);
    }
    return plugin();
  };

const loadPlugin = loader();

const memoryStorage = (): Settings.Storage => {
  const items = new Map<string, string>();
  return { getItem: (key) => items.get(key) ?? null, setItem: (key, value) => void items.set(key, value) };
};

/** Resolves once `predicate` holds for the host's snapshot. */
const until = (
  host: ServiceHost.ServiceHost,
  predicate: (snapshot: ServiceHost.Snapshot) => boolean,
  timeout = 5_000,
): Promise<void> =>
  new Promise((resolve, reject) => {
    if (predicate(host.getSnapshot())) {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      unsubscribe();
      reject(new Error(`timeout waiting on host ${host.id}: ${JSON.stringify(host.getSnapshot().bindings)}`));
    }, timeout);
    const unsubscribe = host.subscribe(() => {
      if (predicate(host.getSnapshot())) {
        clearTimeout(timer);
        unsubscribe();
        resolve();
      }
    });
  });

describe('plugin services', () => {
  const hosts: ServiceHost.ServiceHost[] = [];
  const make = (
    id: string,
    kind: HostControl.Kind,
    features: Record<string, unknown> = {},
    plugins: Record<string, () => Plugin.Plugin> = {},
  ) => {
    const host = new ServiceHost.ServiceHost({ id, kind, features, loadPlugin: loader(plugins) });
    hosts.push(host);
    return host;
  };
  const join = async (
    a: ServiceHost.ServiceHost,
    b: ServiceHost.ServiceHost,
    options: { grant?: readonly string[] } = {},
  ) => {
    const channel = new MessageChannel();
    await Promise.all([a.connect(channel.port1, options), b.connect(channel.port2)]);
    await until(a, (snapshot) => snapshot.peers.some((peer) => peer.id === b.id));
    await until(b, (snapshot) => snapshot.peers.some((peer) => peer.id === a.id));
  };

  afterEach(async () => {
    await Promise.all(hosts.splice(0).map((host) => host.dispose()));
  });

  test('a provider in the consumer host is called in memory', async ({ expect }) => {
    const app = make('app', 'app', { [Settings.STORAGE_FEATURE]: memoryStorage() });
    await app.install('settings');

    const settings = app.client(Settings.Contract);
    expect(app.binding(Settings.Contract)).toMatchObject({ kind: 'memory', hostId: 'app', hostKind: 'app' });

    const setting = await EffectEx.runPromise(settings.set({ key: 'theme', value: 'dark' }));
    expect(setting).toEqual({ key: 'theme', value: 'dark' });
    expect(await EffectEx.runPromise(settings.get({ key: 'theme' }))).toBe('dark');
    expect(await EffectEx.runPromise(settings.values.get)).toEqual({ theme: 'dark' });
  });

  test('the settings store refuses a setting past its limits', async ({ expect }) => {
    const app = make('app', 'app', { [Settings.STORAGE_FEATURE]: memoryStorage() });
    await app.install('settings');
    const settings = app.client(Settings.Contract);

    const tooLong = await Effect.runPromiseExit(settings.set({ key: 'long', value: 'x'.repeat(MAX_VALUE_LENGTH + 1) }));
    expect(String(tooLong)).toContain('value too long');
    expect(await EffectEx.runPromise(settings.values.get)).toEqual({});

    await EffectEx.runPromise(
      Effect.forEach(Array.from({ length: MAX_SETTINGS }), (_, index) =>
        settings.set({ key: `key-${index}`, value: '' }),
      ),
    );
    const tooMany = await Effect.runPromiseExit(settings.set({ key: 'one-too-many', value: '' }));
    expect(String(tooMany)).toContain('setting limit reached');
    // A key the store already has is a change, not a new setting.
    await EffectEx.runPromise(settings.set({ key: 'key-0', value: 'changed' }));
    expect(Object.keys(await EffectEx.runPromise(settings.values.get))).toHaveLength(MAX_SETTINGS);
  });

  test('a contract nobody provides fails with ServiceNotAvailableError', async ({ expect }) => {
    const app = make('app', 'app');
    const summarizer = app.client(Summarizer.Contract);
    const exit = await Effect.runPromiseExit(Stream.runCollect(summarizer.summarize({ text: 'hello' })));
    expect(exit._tag).toBe('Failure');
    expect(String(exit)).toContain('ServiceNotAvailableError');
  });

  test('a provider that lacks a feature stays inactive and names what is unmet', async ({ expect }) => {
    const app = make('app', 'app');
    await app.install('summarizer');
    expect(app.binding(Summarizer.Contract)).toBeUndefined();
    expect(app.getSnapshot().self.services).toEqual([
      {
        key: Summarizer.Contract.key,
        version: '0.1.0',
        active: false,
        instance: '',
        unmet: [Summarizer.GATEWAY_FEATURE],
      },
    ]);
  });

  test('installing into a remote host binds a stub and streams over the port', async ({ expect }) => {
    const app = make('app', 'app');
    const edge = make('edge', 'edge', { [Summarizer.GATEWAY_FEATURE]: fakeGateway('edge', 1) });
    await join(app, edge);

    const summarizer = app.client(Summarizer.Contract);
    expect(app.binding(Summarizer.Contract)).toBeUndefined();

    // Installing is a service call on the remote host's own contract.
    const control = app.control('edge');
    assert(control, 'the app holds the control client of a connected host');
    await EffectEx.runPromise(control.install({ plugin: 'summarizer' }));
    await until(app, (snapshot) => snapshot.bindings[Summarizer.Contract.key]?.kind === 'port');
    expect(app.binding(Summarizer.Contract)).toMatchObject({ kind: 'port', hostId: 'edge', hostKind: 'edge' });

    const tokens = await EffectEx.runPromise(Stream.runCollect(summarizer.summarize({ text: 'one two three' })));
    expect(tokens).toEqual(['[edge]', '3 words:', 'one', 'two', 'three']);
    expect(await EffectEx.runPromise(summarizer.status.get)).toBe('idle');
  });

  test('the same client rebinds in memory when the provider arrives locally', async ({ expect }) => {
    const app = make('app', 'app');
    const edge = make('edge', 'edge', { [Summarizer.GATEWAY_FEATURE]: fakeGateway('edge', 1) });
    await join(app, edge);
    await edge.install('summarizer');
    await until(app, (snapshot) => snapshot.bindings[Summarizer.Contract.key]?.kind === 'port');

    const summarizer = app.client(Summarizer.Contract);
    const first = await EffectEx.runPromise(Stream.runCollect(summarizer.summarize({ text: 'a b' })));
    expect(first[0]).toBe('[edge]');

    await app.install('summarizer');
    await app.setFeature(Summarizer.GATEWAY_FEATURE, fakeGateway('app', 1));
    expect(app.binding(Summarizer.Contract)).toMatchObject({ kind: 'memory', hostId: 'app', hostKind: 'app' });

    const second = await EffectEx.runPromise(Stream.runCollect(summarizer.summarize({ text: 'a b' })));
    expect(second[0]).toBe('[app]');

    // Taking the feature away sends the same handle back to the remote provider.
    await app.setFeature(Summarizer.GATEWAY_FEATURE, undefined);
    const third = await EffectEx.runPromise(Stream.runCollect(summarizer.summarize({ text: 'a b' })));
    expect(third[0]).toBe('[edge]');
  });

  test('a property stream follows the provider across a rebind', async ({ expect }) => {
    const app = make('app', 'app');
    const worker = make('worker', 'worker', { [Settings.STORAGE_FEATURE]: memoryStorage() });
    await join(app, worker);
    await worker.install('settings');
    await until(app, (snapshot) => snapshot.bindings[Settings.Contract.key]?.kind === 'port');

    const settings = app.client(Settings.Contract);
    const seen: Settings.Values[] = [];
    const fiber = Effect.runFork(
      Stream.runForEach(settings.values.changes, (values) => Effect.sync(() => seen.push(values))),
    );

    await expect.poll(() => seen).toEqual([{}]);
    await EffectEx.runPromise(settings.set({ key: 'where', value: 'remote' }));
    await expect.poll(() => seen).toEqual([{}, { where: 'remote' }]);

    // A local provider with its own, empty storage takes over: the stream restarts from its value.
    await app.setFeature(Settings.STORAGE_FEATURE, memoryStorage());
    await app.install('settings');
    await expect.poll(() => seen).toEqual([{}, { where: 'remote' }, {}]);
    await EffectEx.runPromise(settings.set({ key: 'where', value: 'local' }));
    await expect.poll(() => seen).toEqual([{}, { where: 'remote' }, {}, { where: 'local' }]);

    await EffectEx.runPromise(Fiber.interrupt(fiber));
  });

  test('connecting to a peer that never answers fails and leaves nothing behind', async ({ expect }) => {
    const app = new ServiceHost.ServiceHost({ id: 'app', kind: 'app', loadPlugin, connectTimeout: 100 });
    hosts.push(app);
    const channel = new MessageChannel();
    // Nothing listens on the other port, so the handshake never completes.
    await expect(app.connect(channel.port1)).rejects.toThrow('The host did not answer');
    expect(app.getSnapshot().peers).toEqual([]);
    channel.port2.close();
  });

  test('a peer is served only the contracts it was granted', async ({ expect }) => {
    const app = make('app', 'app', { [Settings.STORAGE_FEATURE]: memoryStorage() });
    await app.install('settings');
    const worker = make('worker', 'worker');
    const frame = make('frame', 'frame');
    await join(app, worker);
    await join(app, frame, { grant: [] });

    // The trusted worker reaches the app's settings.
    const fromWorker = worker.client(Settings.Contract);
    expect(await EffectEx.runPromise(fromWorker.values.get)).toEqual({});

    // The frame's catalog of the app leaves out what it was not granted, so nothing resolves there.
    expect(frame.getSnapshot().peers.find((peer) => peer.id === 'app')?.services).toEqual([]);
    expect(frame.binding(Settings.Contract)).toBeUndefined();
    const exit = await Effect.runPromiseExit(frame.client(Settings.Contract).values.get);
    expect(String(exit)).toContain('ServiceNotAvailableError');
  });

  test('a peer with a grant cannot install into the host that granted it', async ({ expect }) => {
    const app = make('app', 'app');
    const frame = make('frame', 'frame');
    await join(app, frame, { grant: [] });

    const control = frame.control('app');
    assert(control, 'the frame holds the control client of the app');
    const exit = await Effect.runPromiseExit(control.install({ plugin: 'settings' }));
    expect(exit._tag).toBe('Failure');
    expect(app.getSnapshot().self.plugins).toEqual([]);
  });

  test('two idle connected hosts stop exchanging catalogs', async ({ expect }) => {
    const app = make('app', 'app');
    const worker = make('worker', 'worker');
    await join(app, worker);
    const control = app.control('worker');
    assert(control, 'the app holds the control client of the worker');
    // Each round trip gives a catalog in flight time to land, as an echoed catalog would need.
    const roundTrips = (count: number) =>
      EffectEx.runPromise(Effect.forEach(Array.from({ length: count }), () => control.probe({ ungranted: '' })));
    await roundTrips(3);

    let changes = 0;
    const unsubscribe = app.subscribe(() => changes++);
    await roundTrips(5);
    unsubscribe();
    expect(changes).toBe(0);
  });

  test('a provider that cannot start fails the install that asked for it', async ({ expect }) => {
    const app = make('app', 'app', { [Settings.STORAGE_FEATURE]: memoryStorage() });
    await expect(app.install('broken')).rejects.toThrow('cannot start');
    expect(app.binding(Settings.Contract)).toBeUndefined();

    // The failure does not stop the host: a later change still goes through.
    await app.setFeature(Summarizer.GATEWAY_FEATURE, fakeGateway('app', 1));
    await app.install('summarizer');
    expect(app.binding(Summarizer.Contract)?.kind).toBe('memory');
  });

  test('a subscription follows a provider replaced in the same host', async ({ expect }) => {
    const app = make('app', 'app', { [Settings.STORAGE_FEATURE]: memoryStorage() });
    await app.install('settings');
    const settings = app.client(Settings.Contract);
    const seen: Settings.Values[] = [];
    const fiber = Effect.runFork(
      Stream.runForEach(settings.values.changes, (values) => Effect.sync(() => seen.push(values))),
    );
    await expect.poll(() => seen).toEqual([{}]);

    // A second plugin takes the contract over in the same host: the binding is still `memory → app`.
    await app.install('otherSettings');
    await expect.poll(() => seen).toEqual([{}, OTHER_VALUES]);

    // Removing it gives the contract back to the first plugin's provider.
    await app.uninstall('otherSettings');
    await expect.poll(() => seen).toEqual([{}, OTHER_VALUES, {}]);

    await EffectEx.runPromise(Fiber.interrupt(fiber));
  });

  test('a subscription outlives a failed call and picks up the replacement provider', async ({ expect }) => {
    const { plugin, failed } = failingSettings();
    const app = make('app', 'app', {}, { failingSettings: plugin });
    await app.install('failingSettings');
    const seen: Settings.Values[] = [];
    const fiber = Effect.runFork(
      Stream.runForEach(app.client(Settings.Contract).values.changes, (values) => Effect.sync(() => seen.push(values))),
    );
    // Once the provider's stream has failed, the subscription must still be listening.
    await failed;
    expect(seen).toEqual([]);

    await app.install('otherSettings');
    await expect.poll(() => seen).toEqual([OTHER_VALUES]);
    await EffectEx.runPromise(Fiber.interrupt(fiber));
  });

  test('a defect in a provider stream still ends the subscription', async ({ expect }) => {
    const app = make('app', 'app');
    await app.install('dyingSettings');
    const exit = await Effect.runPromiseExit(
      Stream.runDrain(app.client(Settings.Contract).values.changes).pipe(Effect.timeout('2 seconds')),
    );
    expect(exit._tag).toBe('Failure');
    expect(String(exit)).toContain('provider defect');
  });

  test('a failed remote install is a typed failure and leaves the catalog live', async ({ expect }) => {
    const app = make('app', 'app');
    const edge = make('edge', 'edge', {
      [Settings.STORAGE_FEATURE]: memoryStorage(),
      [Summarizer.GATEWAY_FEATURE]: fakeGateway('edge', 1),
    });
    await join(app, edge);
    const control = app.control('edge');
    assert(control, 'the app holds the control client of a connected host');

    const exit = await Effect.runPromiseExit(control.install({ plugin: 'broken' }));
    expect(String(exit)).toContain('ServiceCallError');

    // The failure did not end the catalog subscription: a later install still reaches the app.
    await EffectEx.runPromise(control.install({ plugin: 'summarizer' }));
    await until(app, (snapshot) => snapshot.bindings[Summarizer.Contract.key]?.kind === 'port');
  });

  test('a remote subscription follows a provider replaced in its host', async ({ expect }) => {
    const app = make('app', 'app');
    const worker = make('worker', 'worker', { [Settings.STORAGE_FEATURE]: memoryStorage() });
    await join(app, worker);
    await worker.install('settings');
    await until(app, (snapshot) => snapshot.bindings[Settings.Contract.key]?.kind === 'port');

    const seen: Settings.Values[] = [];
    const fiber = Effect.runFork(
      Stream.runForEach(app.client(Settings.Contract).values.changes, (values) => Effect.sync(() => seen.push(values))),
    );
    await expect.poll(() => seen).toEqual([{}]);

    // The worker retires its provider for another one; the watch over the port must move with it.
    await worker.install('otherSettings');
    await expect.poll(() => seen).toEqual([{}, OTHER_VALUES]);
    await EffectEx.runPromise(Fiber.interrupt(fiber));
  });

  test('an install reports only its own provider failing', async ({ expect }) => {
    const app = make('app', 'app', {
      [Settings.STORAGE_FEATURE]: memoryStorage(),
      [Summarizer.GATEWAY_FEATURE]: fakeGateway('app', 1),
    });
    const [summarizer, broken] = await Promise.allSettled([app.install('summarizer'), app.install('broken')]);
    expect(summarizer.status).toBe('fulfilled');
    expect(broken.status).toBe('rejected');
    expect(app.binding(Summarizer.Contract)?.kind).toBe('memory');
  });

  test('version matching: same major, equal or higher minor', ({ expect }) => {
    expect(Service.satisfies('1.2.0', '1.1.0')).toBe(true);
    expect(Service.satisfies('1.0.0', '1.1.0')).toBe(false);
    expect(Service.satisfies('2.0.0', '1.1.0')).toBe(false);
  });
});
