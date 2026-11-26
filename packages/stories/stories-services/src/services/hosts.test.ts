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

import { NoteStore, Summarizer } from '../contracts/index.ts';
import { fakeGateway } from '../hosts/gateway.ts';
import NotesPlugin from '../plugins/notes-plugin.ts';
import SummarizerPlugin from '../plugins/summarizer-plugin.ts';
import { type HostControl, Service, ServiceHost } from './index.ts';

/** A plugin whose provider fails as it starts, as the notes provider would on unreadable storage. */
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
          Service.provide(NoteStore.Contract, {
            needs: [NoteStore.STORAGE_FEATURE],
            make: () => Effect.die(new Error('cannot start')),
          }),
        ),
      ]),
  }),
  Plugin.make,
);

const PLUGINS: Record<string, () => Plugin.Plugin> = {
  notes: NotesPlugin,
  summarizer: SummarizerPlugin,
  broken: BrokenPlugin,
};

const loadPlugin = async (reference: string): Promise<Plugin.Plugin> => {
  const plugin = PLUGINS[reference];
  if (!plugin) {
    throw new Error(`unknown plugin: ${reference}`);
  }
  return plugin();
};

const memoryStorage = (): NoteStore.Storage => {
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
  const make = (id: string, kind: HostControl.Kind, features: Record<string, unknown> = {}) => {
    const host = new ServiceHost.ServiceHost({ id, kind, features, loadPlugin });
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
    const app = make('app', 'app', { [NoteStore.STORAGE_FEATURE]: memoryStorage() });
    await app.install('notes');

    const notes = app.client(NoteStore.Contract);
    expect(app.binding(NoteStore.Contract)).toEqual({ kind: 'memory', hostId: 'app', hostKind: 'app' });

    const note = await EffectEx.runPromise(notes.put({ text: 'first' }));
    expect(note.text).toBe('first');
    expect(await EffectEx.runPromise(notes.list({}))).toHaveLength(1);
    expect(await EffectEx.runPromise(notes.count.get)).toBe(1);
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
      { key: Summarizer.Contract.key, version: '0.1.0', active: false, unmet: [Summarizer.GATEWAY_FEATURE] },
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
    expect(app.binding(Summarizer.Contract)).toEqual({ kind: 'port', hostId: 'edge', hostKind: 'edge' });

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
    expect(app.binding(Summarizer.Contract)).toEqual({ kind: 'memory', hostId: 'app', hostKind: 'app' });

    const second = await EffectEx.runPromise(Stream.runCollect(summarizer.summarize({ text: 'a b' })));
    expect(second[0]).toBe('[app]');

    // Taking the feature away sends the same handle back to the remote provider.
    await app.setFeature(Summarizer.GATEWAY_FEATURE, undefined);
    const third = await EffectEx.runPromise(Stream.runCollect(summarizer.summarize({ text: 'a b' })));
    expect(third[0]).toBe('[edge]');
  });

  test('a property stream follows the provider across a rebind', async ({ expect }) => {
    const app = make('app', 'app');
    const worker = make('worker', 'worker', { [NoteStore.STORAGE_FEATURE]: memoryStorage() });
    await join(app, worker);
    await worker.install('notes');
    await until(app, (snapshot) => snapshot.bindings[NoteStore.Contract.key]?.kind === 'port');

    const notes = app.client(NoteStore.Contract);
    const seen: number[] = [];
    const fiber = Effect.runFork(
      Stream.runForEach(notes.count.changes, (count) => Effect.sync(() => seen.push(count))),
    );

    await expect.poll(() => seen).toEqual([0]);
    await EffectEx.runPromise(notes.put({ text: 'remote' }));
    await expect.poll(() => seen).toEqual([0, 1]);

    // A local provider with its own, empty storage takes over: the stream restarts from its value.
    await app.setFeature(NoteStore.STORAGE_FEATURE, memoryStorage());
    await app.install('notes');
    await expect.poll(() => seen).toEqual([0, 1, 0]);
    await EffectEx.runPromise(notes.put({ text: 'local' }));
    await expect.poll(() => seen).toEqual([0, 1, 0, 1]);

    await EffectEx.runPromise(Fiber.interrupt(fiber));
  });

  test('a peer is served only the contracts it was granted', async ({ expect }) => {
    const app = make('app', 'app', { [NoteStore.STORAGE_FEATURE]: memoryStorage() });
    await app.install('notes');
    const worker = make('worker', 'worker');
    const frame = make('frame', 'frame');
    await join(app, worker);
    await join(app, frame, { grant: [] });

    // The trusted worker reaches the app's notes.
    const fromWorker = worker.client(NoteStore.Contract);
    expect(await EffectEx.runPromise(fromWorker.list({}))).toEqual([]);

    // The frame's catalog of the app leaves out what it was not granted, so nothing resolves there.
    expect(frame.getSnapshot().peers.find((peer) => peer.id === 'app')?.services).toEqual([]);
    expect(frame.binding(NoteStore.Contract)).toBeUndefined();
    const exit = await Effect.runPromiseExit(frame.client(NoteStore.Contract).list({}));
    expect(String(exit)).toContain('ServiceNotAvailableError');
  });

  test('a peer with a grant cannot install into the host that granted it', async ({ expect }) => {
    const app = make('app', 'app');
    const frame = make('frame', 'frame');
    await join(app, frame, { grant: [] });

    const control = frame.control('app');
    assert(control, 'the frame holds the control client of the app');
    const exit = await Effect.runPromiseExit(control.install({ plugin: 'notes' }));
    expect(exit._tag).toBe('Failure');
    expect(app.getSnapshot().self.plugins).toEqual([]);
  });

  test('two idle connected hosts stop exchanging catalogs', async ({ expect }) => {
    const app = make('app', 'app');
    const worker = make('worker', 'worker');
    await join(app, worker);
    await new Promise((resolve) => setTimeout(resolve, 100));

    let changes = 0;
    const unsubscribe = app.subscribe(() => changes++);
    await new Promise((resolve) => setTimeout(resolve, 200));
    unsubscribe();
    expect(changes).toBe(0);
  });

  test('a provider that cannot start fails the install that asked for it', async ({ expect }) => {
    const app = make('app', 'app', { [NoteStore.STORAGE_FEATURE]: memoryStorage() });
    await expect(app.install('broken')).rejects.toThrow('cannot start');
    expect(app.binding(NoteStore.Contract)).toBeUndefined();

    // The failure does not stop the host: a later change still goes through.
    await app.setFeature(Summarizer.GATEWAY_FEATURE, fakeGateway('app', 1));
    await app.install('summarizer');
    expect(app.binding(Summarizer.Contract)?.kind).toBe('memory');
  });

  test('version matching: same major, equal or higher minor', ({ expect }) => {
    expect(Service.satisfies('1.2.0', '1.1.0')).toBe(true);
    expect(Service.satisfies('1.0.0', '1.1.0')).toBe(false);
    expect(Service.satisfies('2.0.0', '1.1.0')).toBe(false);
  });
});
