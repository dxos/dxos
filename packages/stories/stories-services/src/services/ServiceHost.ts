//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import type * as Plugin from '@dxos/app-framework/Plugin';
import * as PluginManager from '@dxos/app-framework/PluginManager';
import * as EffectEx from '@dxos/effect/EffectEx';
import { BaseError } from '@dxos/errors';
import { log } from '@dxos/log';
import { RpcRouter } from '@dxos/rpc';

import * as HostControl from './HostControl.ts';
import * as Link from './Link.ts';
import * as Service from './Service.ts';
import * as State from './State.ts';

/**
 * How a plugin contributes a provider: one multi capability, so providers ride the module system
 * with no loader of their own.
 */
export const Provider = Capability.make<Service.AnyProvider>()('org.dxos.stories.services.capability.provider');

/** A host could not load a plugin; `context` names the host and the reference. */
export class PluginLoadError extends BaseError.extend('PluginLoadError', 'Failed to load the plugin.') {}

/** Where a contract is bound for this host's consumers. */
export type Binding = {
  /** `memory` is a direct call of the provider; `port` crosses to another host. */
  readonly kind: 'memory' | 'port';
  readonly hostId: string;
  readonly hostKind: HostControl.Kind;
};

/** One service call, as the story's log shows it. */
export type Call = {
  readonly at: number;
  readonly key: string;
  readonly member: string;
  readonly binding: Binding;
};

/** Everything a view of the host reads; replaced, never mutated, on every change. */
export type Snapshot = {
  readonly self: HostControl.Description;
  readonly peers: readonly HostControl.Description[];
  readonly bindings: Readonly<Record<string, Binding | undefined>>;
  readonly calls: readonly Call[];
};

export type Options = {
  readonly id: string;
  readonly kind: HostControl.Kind;
  /** What only this runtime has, by name; a provider that needs one is given its value. */
  readonly features?: Readonly<Record<string, unknown>>;
  /** Loads a plugin by reference: a module URL in a browser host, a name in a test. */
  readonly loadPlugin?: (reference: string) => Promise<Plugin.Plugin>;
  /** What this host can reach; a frame host reports what its sandbox refuses. */
  readonly probe?: (ungranted: string) => Promise<HostControl.Probe>;
};

type Registration = {
  readonly provider: Service.AnyProvider;
  unmet: string[];
  /** Present while the provider is active. */
  implementation?: Record<string, unknown>;
  scope?: Scope.Closeable;
};

type Peer = {
  readonly link: Link.Link;
  readonly scope: Scope.Closeable;
  readonly router: RpcRouter.Service;
  /** The contracts this peer may be served; undefined serves every one. */
  readonly grant: ReadonlySet<string> | undefined;
  readonly served: Map<string, Scope.Closeable>;
  readonly control: HostControl.Client;
  readonly stubs: Map<string, Promise<unknown>>;
  description?: HostControl.Description;
};

const MAX_CALLS = 50;

/** Nearer hosts first: the same device before EDGE. */
const DISTANCE: Record<HostControl.Kind, number> = { app: 0, worker: 1, frame: 2, edge: 3 };

/**
 * The container of one runtime. It loads plugins, activates the providers this runtime can run,
 * serves them to connected hosts, and resolves a contract for its own consumers to the nearest
 * host that provides it.
 */
export class ServiceHost {
  readonly id: string;
  readonly kind: HostControl.Kind;

  readonly #options: Options;
  readonly #scope: Scope.Closeable;
  readonly #manager: PluginManager.PluginManager;
  readonly #features = new Map<string, unknown>();
  readonly #registrations = new Map<string, Registration>();
  readonly #pluginOf = new Map<string, string>();
  readonly #plugins = new Set<string>();
  readonly #peers = new Set<Peer>();
  readonly #listeners = new Set<() => void>();
  readonly #description: State.Cell<HostControl.Description>;
  readonly #topology = State.emitter<void>();
  #calls: Call[] = [];
  #snapshot: Snapshot;
  /** Serializes changes to registrations, so two feature changes never activate a provider twice. */
  #queue: Promise<void> = Promise.resolve();

  constructor(options: Options) {
    this.id = options.id;
    this.kind = options.kind;
    this.#options = options;
    this.#scope = Effect.runSync(Scope.make());
    Object.entries(options.features ?? {}).forEach(([name, value]) => this.#features.set(name, value));
    this.#description = State.cell(this.#describe());
    this.#snapshot = { self: this.#description.get(), peers: [], bindings: {}, calls: [] };

    this.#manager = PluginManager.make({
      pluginLoader: (reference) =>
        Effect.tryPromise({
          try: async () => {
            const load = this.#options.loadPlugin;
            if (!load) {
              throw new PluginLoadError({ context: { host: this.id, reference, reason: 'host has no loader' } });
            }
            return { plugin: await load(reference) };
          },
          catch: (cause) => new PluginLoadError({ cause, context: { host: this.id, reference } }),
        }),
      plugins: [],
      enabled: [],
    });
    const providers = this.#manager.capabilities.atomByModule(Provider);
    const cancel = this.#manager.registry.subscribe(providers, (byModule) => this.#syncProviders(byModule), {
      immediate: true,
    });
    Effect.runSync(Scope.addFinalizer(this.#scope, Effect.sync(cancel)));
  }

  //
  // Observation
  //

  readonly subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  readonly getSnapshot = (): Snapshot => this.#snapshot;

  /** Resolves once every queued change to this host's providers has been applied. */
  async settled(): Promise<void> {
    await this.#queue;
  }

  //
  // Features and plugins
  //

  /** Gives the host a feature, or takes one away with `undefined`; providers that need it follow. */
  setFeature(name: string, value: unknown): Promise<void> {
    if (value === undefined) {
      this.#features.delete(name);
    } else {
      this.#features.set(name, value);
    }
    return this.#enqueue(() => this.#reconcile());
  }

  /** Loads a plugin by reference and enables it. */
  async install(reference: string): Promise<void> {
    await EffectEx.runPromise(
      Effect.gen({ self: this }, function* () {
        const plugin = yield* this.#manager.add(reference);
        const key = plugin.meta.profile.key;
        this.#plugins.add(reference);
        this.#pluginOf.set(key, reference);
        yield* this.#manager.enable(key);
        yield* this.#manager.activate(ActivationEvents.Startup);
      }),
    );
    await this.settled();
  }

  async uninstall(reference: string): Promise<void> {
    const key = [...this.#pluginOf].find(([, value]) => value === reference)?.[0];
    if (key === undefined) {
      return;
    }
    await EffectEx.runPromise(this.#manager.remove(key));
    this.#plugins.delete(reference);
    this.#pluginOf.delete(key);
    await this.settled();
    await this.#enqueue(() => this.#reconcile());
  }

  //
  // Hosts
  //

  /**
   * Connects this host to another over `port`. Both sides call it; each serves the other its
   * providers and reads the other's catalog. `grant` limits what this host serves to that peer.
   */
  async connect(port: MessagePort, options: { readonly grant?: readonly string[] } = {}): Promise<void> {
    const link = Link.make(port);
    const scope = await EffectEx.runPromise(Scope.make());
    const router = await EffectEx.runPromise(RpcRouter.make);
    link.onServe((served) => {
      Effect.runFork(Link.serve(router, served).pipe(Scope.provide(scope)));
    });
    const call = await EffectEx.runPromise(
      Link.call(HostControl.Contract.group, link.open()).pipe(Scope.provide(scope)),
    );
    const peer: Peer = {
      link,
      scope,
      router,
      grant: options.grant === undefined ? undefined : new Set([HostControl.Contract.key, ...options.grant]),
      served: new Map(),
      control: Service.toStub(HostControl.Contract, call),
      stubs: new Map(),
    };
    this.#peers.add(peer);
    await this.#serve(peer, HostControl.Contract, this.#control());
    await this.#enqueue(() => this.#reconcile());

    Effect.runFork(
      Stream.runForEach(peer.control.description.changes, (description) =>
        Effect.sync(() => {
          peer.description = description;
          this.#changed();
        }),
      ).pipe(
        Effect.catchCause((cause) => Effect.sync(() => log.warn('peer catalog ended', { host: this.id, cause }))),
        Effect.forkScoped,
        Scope.provide(scope),
      ),
    );
  }

  /** Disconnects the peer with the given id. */
  async disconnect(hostId: string): Promise<void> {
    const peer = [...this.#peers].find((candidate) => candidate.description?.id === hostId);
    if (!peer) {
      return;
    }
    this.#peers.delete(peer);
    await EffectEx.runPromise(Scope.close(peer.scope, Exit.void));
    peer.link.close();
    this.#changed();
  }

  /** The control client of a connected host, for installing into it. */
  control(hostId: string): HostControl.Client | undefined {
    return [...this.#peers].find((peer) => peer.description?.id === hostId)?.control;
  }

  async dispose(): Promise<void> {
    await Promise.all([...this.#peers].map((peer) => this.disconnect(peer.description?.id ?? '')));
    for (const peer of this.#peers) {
      await EffectEx.runPromise(Scope.close(peer.scope, Exit.void));
      peer.link.close();
    }
    this.#peers.clear();
    await EffectEx.runPromise(this.#manager.shutdown().pipe(Effect.ignore));
    await this.#enqueue(async () => {
      for (const key of [...this.#registrations.keys()]) {
        await this.#deactivate(key);
      }
    });
    await EffectEx.runPromise(Scope.close(this.#scope, Exit.void));
  }

  //
  // Consumers
  //

  /** Where `contract` would be bound right now, without calling it. */
  binding(contract: Service.AnyContract): Binding | undefined {
    const local = this.#registrations.get(contract.key);
    if (local?.implementation && Service.satisfies(local.provider.contract.version, contract.version)) {
      return { kind: 'memory', hostId: this.id, hostKind: this.kind };
    }
    const peer = this.#peerFor(contract);
    return peer?.description
      ? { kind: 'port', hostId: peer.description.id, hostKind: peer.description.kind }
      : undefined;
  }

  /**
   * The client of a contract. The handle is stable: each call goes to whichever host provides the
   * contract at that moment, so a consumer never rebuilds it when a provider moves.
   */
  client<Key extends string, S extends Service.Shape>(contract: Service.Contract<Key, S>): Service.Client<S> {
    const bound = (member: string): Effect.Effect<Record<string, unknown>, Service.ServiceError> =>
      Effect.suspend((): Effect.Effect<Record<string, unknown>, Service.ServiceError> => {
        const binding = this.binding(contract);
        if (!binding) {
          return Effect.fail(
            new Service.ServiceNotAvailableError({
              context: { key: contract.key, unmet: this.#registrations.get(contract.key)?.unmet ?? [] },
            }),
          );
        }
        this.#record({ at: Date.now(), key: contract.key, member, binding });
        const local = this.#registrations.get(contract.key)?.implementation;
        if (binding.kind === 'memory' && local) {
          return Effect.succeed(local);
        }
        return Effect.tryPromise({
          try: () => this.#stub(contract),
          catch: (cause) => new Service.ServiceCallError({ cause, context: { key: contract.key, member } }),
        });
      });

    // Re-read on every change of topology, so a stream of a property follows the provider.
    const bindings = Stream.concat(Stream.succeed(undefined), this.#topology.stream).pipe(
      Stream.map(() => this.binding(contract)),
      Stream.changesWith((a, b) => a?.kind === b?.kind && a?.hostId === b?.hostId),
    );
    const follow = (member: string, select: (target: Record<string, unknown>) => unknown) =>
      Stream.switchMap(bindings, (binding) =>
        binding === undefined
          ? Stream.empty
          : Stream.unwrap(
              Effect.map(bound(member), (target) => {
                const stream = select(target);
                return Stream.isStream(stream)
                  ? (stream as Stream.Stream<unknown, Service.ServiceError>)
                  : Stream.empty;
              }),
            ),
      );

    const client: Record<string, unknown> = {};
    for (const [name, method] of Object.entries(contract.shape.methods)) {
      client[name] =
        method.stream === true
          ? (payload: unknown) =>
              Stream.unwrap(
                Effect.map(bound(name), (target) => {
                  const member = target[name];
                  const result = typeof member === 'function' ? member(payload) : undefined;
                  return Stream.isStream(result)
                    ? (result as Stream.Stream<unknown, Service.ServiceError>)
                    : Stream.empty;
                }),
              )
          : (payload: unknown) =>
              Effect.flatMap(bound(name), (target) => {
                const member = target[name];
                const result = typeof member === 'function' ? member(payload) : undefined;
                return Effect.isEffect(result) ? (result as Effect.Effect<unknown, Service.ServiceError>) : Effect.void;
              });
    }
    for (const name of Object.keys(contract.shape.properties)) {
      const property: Service.Property<unknown> = {
        get: Effect.flatMap(bound(name), (target) => {
          const member = target[name];
          return isProperty(member) ? member.get : Effect.void;
        }),
        changes: follow(name, (target) => {
          const member = target[name];
          return isProperty(member) ? member.changes : undefined;
        }),
      };
      client[name] = property;
    }
    for (const name of Object.keys(contract.shape.events)) {
      client[name] = follow(name, (target) => target[name]);
    }
    // Built member by member from the contract's own shape, which is what `Client<S>` maps over.
    return client as Service.Client<S>;
  }

  //
  // Internals
  //

  #enqueue(task: () => Promise<void>): Promise<void> {
    this.#queue = this.#queue.then(task).catch((err) => log.catch(err));
    return this.#queue;
  }

  #syncProviders(byModule: Record<string, Service.AnyProvider[]>): void {
    void this.#enqueue(async () => {
      const current = new Map<string, Service.AnyProvider>();
      Object.values(byModule)
        .flat()
        .forEach((provider) => current.set(provider.contract.key, provider));
      for (const key of [...this.#registrations.keys()]) {
        if (!current.has(key)) {
          await this.#deactivate(key);
          this.#registrations.delete(key);
        }
      }
      for (const [key, provider] of current) {
        if (!this.#registrations.has(key)) {
          this.#registrations.set(key, { provider, unmet: [] });
        }
      }
      await this.#reconcile();
    });
  }

  /** Activates each provider whose needs this host now meets, deactivates the rest, and re-serves peers. */
  async #reconcile(): Promise<void> {
    for (const [key, registration] of this.#registrations) {
      registration.unmet = registration.provider.needs.filter((name) => !this.#features.has(name));
      if (registration.unmet.length === 0 && !registration.implementation) {
        await this.#activate(registration);
      } else if (registration.unmet.length > 0 && registration.implementation) {
        await this.#deactivate(key);
      }
    }
    for (const peer of this.#peers) {
      for (const [key, registration] of this.#registrations) {
        const allowed = peer.grant === undefined || peer.grant.has(key);
        if (registration.implementation && allowed && !peer.served.has(key)) {
          await this.#serve(peer, registration.provider.contract, registration.implementation);
        } else if ((!registration.implementation || !allowed) && peer.served.has(key)) {
          await this.#unserve(peer, key);
        }
      }
      for (const key of [...peer.served.keys()]) {
        if (key !== HostControl.Contract.key && !this.#registrations.has(key)) {
          await this.#unserve(peer, key);
        }
      }
    }
    this.#changed();
  }

  async #activate(registration: Registration): Promise<void> {
    const scope = await EffectEx.runPromise(Scope.make());
    const implementation = await EffectEx.runPromise(
      registration.provider
        .make({
          hostId: this.id,
          feature: <T>(name: string) => this.#features.get(name) as T,
        })
        .pipe(Scope.provide(scope)),
    );
    registration.scope = scope;
    registration.implementation = isRecord(implementation) ? implementation : {};
  }

  async #deactivate(key: string): Promise<void> {
    const registration = this.#registrations.get(key);
    if (!registration?.scope) {
      return;
    }
    for (const peer of this.#peers) {
      await this.#unserve(peer, key);
    }
    const scope = registration.scope;
    registration.scope = undefined;
    registration.implementation = undefined;
    await EffectEx.runPromise(Scope.close(scope, Exit.void));
  }

  async #serve(peer: Peer, contract: Service.AnyContract, implementation: Record<string, unknown>): Promise<void> {
    const scope = await EffectEx.runPromise(Scope.make());
    const handlers = Service.toHandlers(contract, implementation);
    await EffectEx.runPromise(
      peer.router.serve(Service.prefix(contract.key), contract.group, { disableTracing: true }).pipe(
        // The group's handler types are keyed by rpc tag, which a contract only knows at run time.
        Effect.provide(contract.group.toLayer(Effect.succeed(handlers as never))),
        Scope.provide(scope),
      ),
    );
    peer.served.set(contract.key, scope);
  }

  async #unserve(peer: Peer, key: string): Promise<void> {
    const scope = peer.served.get(key);
    if (scope) {
      peer.served.delete(key);
      await EffectEx.runPromise(Scope.close(scope, Exit.void));
    }
  }

  /** This host's own control contract, served to every peer. */
  #control(): Record<string, unknown> {
    const control: HostControl.Client = {
      install: ({ plugin }) => Effect.promise(() => this.install(plugin)),
      uninstall: ({ plugin }) => Effect.promise(() => this.uninstall(plugin)),
      probe: ({ ungranted }) =>
        Effect.promise(async () => {
          const probe = this.#options.probe;
          return probe
            ? probe(ungranted)
            : { localStorage: 'not probed', indexedDb: 'not probed', network: 'not probed', ungranted: 'not probed' };
        }),
      description: this.#description.property,
    };
    return control;
  }

  #peerFor(contract: Service.AnyContract): Peer | undefined {
    return [...this.#peers]
      .filter((peer) =>
        peer.description?.services.some(
          (service) =>
            service.key === contract.key && service.active && Service.satisfies(service.version, contract.version),
        ),
      )
      .sort((a, b) => DISTANCE[a.description?.kind ?? 'edge'] - DISTANCE[b.description?.kind ?? 'edge'])[0];
  }

  #stub<Key extends string, S extends Service.Shape>(
    contract: Service.Contract<Key, S>,
  ): Promise<Record<string, unknown>> {
    const peer = this.#peerFor(contract);
    if (!peer) {
      return Promise.reject(new Error(`no host provides ${contract.key}`));
    }
    let stub = peer.stubs.get(contract.key);
    if (!stub) {
      stub = EffectEx.runPromise(
        Link.call(contract.group, peer.link.open()).pipe(
          Effect.map((call) => Service.toStub(contract, call)),
          Scope.provide(peer.scope),
        ),
      );
      peer.stubs.set(contract.key, stub);
    }
    return stub.then((value) => (isRecord(value) ? value : {}));
  }

  #describe(): HostControl.Description {
    return {
      id: this.id,
      kind: this.kind,
      features: [...this.#features.keys()].sort(),
      plugins: [...this.#plugins].sort(),
      services: [...this.#registrations.values()].map((registration) => ({
        key: registration.provider.contract.key,
        version: registration.provider.contract.version,
        active: registration.implementation !== undefined,
        unmet: registration.unmet,
      })),
    };
  }

  #record(call: Call): void {
    this.#calls = [call, ...this.#calls].slice(0, MAX_CALLS);
    log.info('service call', {
      key: call.key,
      member: call.member,
      binding: call.binding.kind,
      host: call.binding.hostId,
    });
    this.#publish();
  }

  /** Something a resolution depends on changed: providers, features or a peer's catalog. */
  #changed(): void {
    this.#description.set(this.#describe());
    this.#topology.emit();
    this.#publish();
  }

  #publish(): void {
    const peers = [...this.#peers].flatMap((peer) => (peer.description ? [peer.description] : []));
    const keys = new Set<string>([
      ...this.#registrations.keys(),
      ...peers.flatMap((peer) => peer.services.map((service) => service.key)),
    ]);
    const bindings: Record<string, Binding | undefined> = {};
    for (const key of keys) {
      const local = this.#registrations.get(key);
      const remote = peers
        .filter((peer) => peer.services.some((service) => service.key === key && service.active))
        .sort((a, b) => DISTANCE[a.kind] - DISTANCE[b.kind])[0];
      bindings[key] = local?.implementation
        ? { kind: 'memory', hostId: this.id, hostKind: this.kind }
        : remote
          ? { kind: 'port', hostId: remote.id, hostKind: remote.kind }
          : undefined;
    }
    this.#snapshot = { self: this.#description.get(), peers, bindings, calls: this.#calls };
    this.#listeners.forEach((listener) => listener());
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isProperty = (value: unknown): value is Service.Property<unknown> =>
  isRecord(value) && 'get' in value && 'changes' in value;
