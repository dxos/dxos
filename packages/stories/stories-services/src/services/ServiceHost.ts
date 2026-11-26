//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';
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

/** The other host sent no catalog in time; `context` names this host. */
export class HostConnectError extends BaseError.extend('HostConnectError', 'The host did not answer.') {}

/** Where a contract is bound for this host's consumers. */
export type Binding = {
  /** `memory` is a direct call of the provider; `port` crosses to another host. */
  readonly kind: 'memory' | 'port';
  /** Which activation of the provider this is, so a provider replaced in the same host is a new binding. */
  readonly instance: string;
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
  /** How long a new peer has to answer, in milliseconds; a test shortens it. */
  readonly connectTimeout?: number;
  /** What this host can reach; a frame host reports what its sandbox refuses. */
  readonly probe?: (ungranted: string) => Promise<HostControl.Probe>;
};

type Registration = {
  readonly provider: Service.AnyProvider;
  unmet: string[];
  /** Present while the provider is active. */
  implementation?: Record<string, unknown>;
  /** The key of the plugin that contributed the provider. */
  readonly plugin: string;
  /** Names this activation; a new one each time the provider starts. */
  instance?: string;
  /** Why the provider failed to start. It is not tried again until its plugin is installed again. */
  failure?: unknown;
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

/** How long a new peer has to complete its handshake, and then to send its first catalog. */
const CONNECT_TIMEOUT = 10_000;

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
  #activations = 0;
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
    // A provider this change started and that failed is this caller's failure, and nobody else's.
    return this.#enqueue(async () => {
      const failures = await this.#reconcile();
      if (failures.length > 0) {
        throw failures[0];
      }
    });
  }

  /** Loads a plugin by reference and enables it. */
  async install(reference: string): Promise<void> {
    let pluginKey: string | undefined;
    await EffectEx.runPromise(
      Effect.gen({ self: this }, function* () {
        const plugin = yield* this.#manager.add(reference);
        const key = plugin.meta.profile.key;
        pluginKey = key;
        this.#plugins.add(reference);
        this.#pluginOf.set(key, reference);
        yield* this.#manager.enable(key);
        yield* this.#manager.activate(ActivationEvents.Startup);
      }),
    );
    await this.settled();
    // The plugin's provider is started by the registry's own callback, which nobody awaits. Only this
    // plugin's providers are read, so another operation failing meanwhile is not reported here.
    const failed = [...this.#registrations.values()].find(
      (registration) => registration.plugin === pluginKey && registration.failure !== undefined,
    );
    if (failed) {
      throw failed.failure;
    }
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
    await this.#enqueue(async () => void (await this.#reconcile()));
  }

  //
  // Hosts
  //

  /**
   * Connects this host to another over `port`. Both sides call it; each serves the other its
   * providers and reads the other's catalog. `grant` limits what this host serves to that peer.
   */
  async connect(port: MessagePort, options: { readonly grant?: readonly string[] } = {}): Promise<string> {
    const link = Link.make(port);
    const scope = await EffectEx.runPromise(Scope.make());
    const timeout = this.#options.connectTimeout ?? CONNECT_TIMEOUT;
    let peer: Peer | undefined;
    try {
      const router = await EffectEx.runPromise(RpcRouter.make);
      link.onServe((served) => {
        Effect.runFork(Link.serve(router, served).pipe(Scope.provide(scope)));
      });
      // The client's construction waits for the peer's handshake, so the deadline has to cover it:
      // a worker or frame that never starts its host would otherwise hang the connection for good.
      const call = await EffectEx.runPromise(
        Link.call(HostControl.Contract.group, link.open()).pipe(Scope.provide(scope), Effect.timeoutOption(timeout)),
      );
      if (Option.isNone(call)) {
        throw new HostConnectError({ context: { host: this.id, reason: 'no handshake' } });
      }
      const connected: Peer = {
        link,
        scope,
        router,
        grant: options.grant === undefined ? undefined : new Set([HostControl.Contract.key, ...options.grant]),
        served: new Map(),
        control: Service.toStub(HostControl.Contract, call.value),
        stubs: new Map(),
      };
      peer = connected;
      this.#peers.add(connected);
      await this.#serve(connected, HostControl.Contract, this.#control(connected));
      await this.#enqueue(async () => void (await this.#reconcile()));

      // A peer is addressed by the id in its catalog, so the connection is not ready before one arrives.
      let arrived: (id: string) => void = () => {};
      const first = new Promise<string>((resolve) => {
        arrived = resolve;
      });
      Effect.runFork(
        Stream.runForEach(connected.control.description.changes, (description) =>
          Effect.sync(() => {
            connected.description = description;
            arrived(description.id);
            // Republishing this host's catalog here would make two idle hosts answer each other forever.
            this.#topologyChanged();
          }),
        ).pipe(
          Effect.catchCause((cause) => Effect.sync(() => log.warn('peer catalog ended', { host: this.id, cause }))),
          Effect.forkScoped,
          Scope.provide(scope),
        ),
      );

      const id = await EffectEx.runPromise(Effect.promise(() => first).pipe(Effect.timeoutOption(timeout)));
      if (Option.isNone(id)) {
        throw new HostConnectError({ context: { host: this.id, reason: 'no catalog' } });
      }
      return id.value;
    } catch (err) {
      if (peer) {
        this.#peers.delete(peer);
      }
      await EffectEx.runPromise(Scope.close(scope, Exit.void));
      link.close();
      throw err;
    }
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
    this.#topologyChanged();
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
      return { kind: 'memory', hostId: this.id, hostKind: this.kind, instance: local.instance ?? '' };
    }
    const peer = this.#peerFor(contract);
    return peer?.description
      ? {
          kind: 'port',
          hostId: peer.description.id,
          hostKind: peer.description.kind,
          instance: peer.description.services.find((service) => service.key === contract.key)?.instance ?? '',
        }
      : undefined;
  }

  /**
   * The client of a contract. The handle is stable: each call goes to whichever host provides the
   * contract at that moment, so a consumer never rebuilds it when a provider moves.
   */
  client<Key extends string, S extends Service.Shape>(contract: Service.Contract<Key, S>): Service.Client<S> {
    const bound = (member: string): Effect.Effect<Record<string, unknown>, Service.Failure> =>
      Effect.suspend((): Effect.Effect<Record<string, unknown>, Service.Failure> => {
        const binding = this.binding(contract);
        if (!binding) {
          return Effect.fail(
            new Service.NotAvailableError({
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
          catch: (cause) => new Service.CallError({ cause, context: { key: contract.key, member } }),
        });
      });

    // Re-read on every change of topology, so a stream of a property follows the provider.
    const bindings = Stream.concat(Stream.succeed(undefined), this.#topology.stream).pipe(
      Stream.map(() => this.binding(contract)),
      // The instance is part of the identity: a provider replaced in the same host must be subscribed to again.
      Stream.changesWith((a, b) => a?.kind === b?.kind && a?.hostId === b?.hostId && a?.instance === b?.instance),
    );
    const follow = (member: string, select: (target: Record<string, unknown>) => unknown) =>
      Stream.switchMap(bindings, (binding) =>
        binding === undefined
          ? Stream.empty
          : Stream.unwrap(
              Effect.map(bound(member), (target) => {
                const stream = select(target);
                return Stream.isStream(stream) ? (stream as Stream.Stream<unknown, Service.Failure>) : Stream.empty;
              }),
            ).pipe(
              // A provider's failed call ends that provider's values only, so the next provider's can still
              // arrive. Any other failure, and every defect, still ends the subscription.
              Stream.catchTag('ServiceCallError', (error) => {
                log.warn('service stream failed', { key: contract.key, member, error });
                return Stream.empty;
              }),
              // A host that retires a provider interrupts the watches on it. That ends this provider's
              // values too; the replacement's catalog then starts the next watch.
              Stream.catchCauseIf(Cause.hasInterruptsOnly, () => Stream.empty),
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
                  return Stream.isStream(result) ? (result as Stream.Stream<unknown, Service.Failure>) : Stream.empty;
                }),
              )
          : (payload: unknown) =>
              Effect.flatMap(bound(name), (target) => {
                const member = target[name];
                const result = typeof member === 'function' ? member(payload) : undefined;
                return Effect.isEffect(result) ? (result as Effect.Effect<unknown, Service.Failure>) : Effect.void;
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
    const result = this.#queue.then(task);
    // The tail recovers so later tasks run; the caller still sees its own task fail.
    this.#queue = result.catch((err) => log.catch(err));
    return result;
  }

  #syncProviders(byModule: Record<string, Service.AnyProvider[]>): void {
    // Nobody awaits a change the registry started; `install` reads the failure it left on its own providers.
    const done = () => undefined;
    this.#enqueue(async () => {
      const current = new Map<string, { provider: Service.AnyProvider; plugin: string }>();
      for (const [moduleId, providers] of Object.entries(byModule)) {
        // A module's id is its plugin's key followed by `.module.<name>`.
        const plugin = moduleId.split('.module.')[0];
        providers.forEach((provider) => current.set(provider.contract.key, { provider, plugin }));
      }
      for (const key of [...this.#registrations.keys()]) {
        if (!current.has(key)) {
          await this.#deactivate(key);
          this.#registrations.delete(key);
        }
      }
      for (const [key, { provider, plugin }] of current) {
        // Another plugin now provides the contract: the old provider must not go on answering for it.
        if (this.#registrations.has(key) && this.#registrations.get(key)?.provider !== provider) {
          await this.#deactivate(key);
          this.#registrations.delete(key);
        }
        if (!this.#registrations.has(key)) {
          this.#registrations.set(key, { provider, plugin, unmet: [] });
        }
      }
      await this.#reconcile();
    }).then(done, done);
  }

  /**
   * Activates each provider whose needs this host now meets, deactivates the rest, and re-serves
   * peers. Returns the failures of the providers this pass tried to start.
   */
  async #reconcile(): Promise<readonly unknown[]> {
    // One provider that cannot start must not keep the others from starting or being served.
    const failures: unknown[] = [];
    for (const [key, registration] of this.#registrations) {
      registration.unmet = registration.provider.needs.filter((name) => !this.#features.has(name));
      if (registration.unmet.length === 0 && !registration.implementation && registration.failure === undefined) {
        await this.#activate(registration).catch((err) => {
          // Trying again on every later change would fail each of them for a fault that is not theirs.
          registration.failure = err;
          failures.push(err);
        });
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
    return failures;
  }

  async #activate(registration: Registration): Promise<void> {
    const scope = await EffectEx.runPromise(Scope.make());
    try {
      const implementation = await EffectEx.runPromise(
        registration.provider
          .make({
            hostId: this.id,
            feature: <T>(name: string) => this.#features.get(name) as T,
          })
          .pipe(Scope.provide(scope)),
      );
      // The registration owns the scope only once the provider exists.
      registration.scope = scope;
      registration.instance = `${this.id}#${++this.#activations}`;
      registration.implementation = isRecord(implementation) ? implementation : {};
    } catch (err) {
      await EffectEx.runPromise(Scope.close(scope, Exit.die(err)));
      throw err;
    }
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
    registration.instance = undefined;
    registration.implementation = undefined;
    await EffectEx.runPromise(Scope.close(scope, Exit.void));
  }

  async #serve(peer: Peer, contract: Service.AnyContract, implementation: Record<string, unknown>): Promise<void> {
    const scope = await EffectEx.runPromise(Scope.make());
    const handlers = Service.toHandlers(contract, implementation);
    await EffectEx.runPromise(
      peer.router
        // A defect in one handler fails that request, not every request and stream on the connection.
        .serve(Service.prefix(contract.key), contract.group, { disableTracing: true, disableFatalDefects: true })
        .pipe(
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

  /**
   * This host's own contract, as one peer is served it. A peer with a grant is not trusted: it
   * reads the catalog of what it was granted, and may not install into this host.
   */
  #control(peer: Peer): Record<string, unknown> {
    const grant = peer.grant;
    const refuse = (member: string) =>
      Effect.fail(new Service.CallError({ context: { key: HostControl.Contract.key, member, reason: 'not granted' } }));
    // A rejection has to be a typed failure: a defect would end every stream on the peer's control client,
    // its catalog subscription included.
    const administer = (member: string, action: () => Promise<void>) =>
      Effect.tryPromise({
        try: action,
        catch: (cause) =>
          new Service.CallError({
            cause,
            context: {
              key: HostControl.Contract.key,
              member,
              reason: cause instanceof Error ? cause.message : String(cause),
            },
          }),
      });
    const visible = (description: HostControl.Description): HostControl.Description =>
      grant === undefined
        ? description
        : { ...description, services: description.services.filter((service) => grant.has(service.key)) };
    const control: HostControl.Client = {
      install:
        grant === undefined
          ? ({ plugin }) => administer('install', () => this.install(plugin))
          : () => refuse('install'),
      uninstall:
        grant === undefined
          ? ({ plugin }) => administer('uninstall', () => this.uninstall(plugin))
          : () => refuse('uninstall'),
      probe: ({ ungranted }) =>
        Effect.promise(async () => {
          const probe = this.#options.probe;
          return probe
            ? probe(ungranted)
            : { localStorage: 'not probed', indexedDb: 'not probed', network: 'not probed', ungranted: 'not probed' };
        }),
      description: {
        get: Effect.map(this.#description.property.get, visible),
        changes: Stream.map(this.#description.property.changes, visible),
      },
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
        instance: registration.instance ?? '',
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

  /** This host's own catalog may have changed: its providers, features or plugins. */
  #changed(): void {
    const description = this.#describe();
    if (JSON.stringify(description) !== JSON.stringify(this.#description.get())) {
      this.#description.set(description);
    }
    this.#topologyChanged();
  }

  /** Something a resolution depends on changed, in this host or in a peer. */
  #topologyChanged(): void {
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
        ? { kind: 'memory', hostId: this.id, hostKind: this.kind, instance: local.instance ?? '' }
        : remote
          ? {
              kind: 'port',
              hostId: remote.id,
              hostKind: remote.kind,
              instance: remote.services.find((service) => service.key === key)?.instance ?? '',
            }
          : undefined;
    }
    this.#snapshot = { self: this.#description.get(), peers, bindings, calls: this.#calls };
    this.#listeners.forEach((listener) => listener());
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isProperty = (value: unknown): value is Service.Property<unknown> =>
  isRecord(value) && 'get' in value && 'changes' in value;
