//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as EArray from 'effect/Array';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Order from 'effect/Order';
import * as Atom from 'effect/reactivity/Atom';
import * as AtomRegistry from 'effect/reactivity/AtomRegistry';
import * as Schema from 'effect/Schema';

import * as Skill from '@dxos/compute/Skill';
import { Resource } from '@dxos/context';
import { Database, DXN, Feed, Obj, Query, type QueryResult, Ref, Type } from '@dxos/echo';
import * as AtomEx from '@dxos/effect/AtomEx';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as RuntimeProvider from '@dxos/effect/RuntimeProvider';
import { assertArgument, invariant } from '@dxos/invariant';
import { EID, type URI } from '@dxos/keys';
import { log } from '@dxos/log';
import { ComplexSet, isNonNullable } from '@dxos/util';

/**
 * Thread message that binds or unbinds contextual objects to a conversation.
 */
export class Binding extends Type.makeObject<Binding>(DXN.make('org.dxos.type.contextBinding', '0.1.0'))(
  Schema.Struct({
    skills: Schema.Struct({
      added: Schema.Array(Ref.Ref(Skill.Skill)),
      removed: Schema.Array(Ref.Ref(Skill.Skill)),
    }),

    objects: Schema.Struct({
      added: Schema.Array(Ref.Ref(Obj.Unknown)),
      removed: Schema.Array(Ref.Ref(Obj.Unknown)),
    }),

    /**
     * Connections whose MCP server the conversation turns on or off. A connection never named here
     * follows the space default, which is on.
     */
    connections: Schema.optional(
      Schema.Struct({
        added: Schema.Array(Ref.Ref(Obj.Unknown)),
        removed: Schema.Array(Ref.Ref(Obj.Unknown)),
      }),
    ),
  }),
) {}
export type BindingProps = Partial<{
  skills: Ref.Ref<Skill.Skill>[];
  objects: Ref.Ref<Obj.Unknown>[];
}>;

export class Bindings {
  readonly skills = new ComplexSet<Ref.Ref<Skill.Skill>>((ref) => ref.uri);

  // TODO(burdon): Some DXNs have the Space prefix so only compare the object ID.
  readonly objects = new ComplexSet<Ref.Ref<Obj.Unknown>>((ref) => entityIdOf(ref.uri) ?? ref.uri);

  toJSON(): { skills: URI.URI[]; objects: URI.URI[] } {
    return {
      skills: EArray.fromIterable(this.skills).map((ref) => ref.uri),
      objects: EArray.fromIterable(this.objects).map((ref) => ref.uri),
    };
  }
}

/**
 * Bindings appended in this realm, per feed id (stable whether or not the feed is persisted yet).
 *
 * Lets {@link Binder.sync} skip its re-read when nothing here could have changed the bindings: the
 * re-read is a feed-scoped query, which waits for an index pass over every pending write, and it
 * exists only for read-your-writes — a binding written elsewhere arrives through the live query.
 */
const bindingWrites = new Map<string, number>();

/** Writes another process may have made to any feed's bindings; see {@link noteExternalBindingWrite}. */
let externalBindingWrites = 0;

const bindingWriteCount = (feed: Feed.Feed): number => (bindingWrites.get(feed.id) ?? 0) + externalBindingWrites;

/**
 * Tells this realm's binders that bindings may have been written outside it, so their next {@link Binder.sync}
 * re-reads. For a host whose tools run in another process and whose live query does not carry their writes back
 * (an EDGE agent: `enable-skills` binds in operation-service while the turn runs in compute-service).
 */
export const noteExternalBindingWrite = (): void => {
  externalBindingWrites++;
};

/** How long a sync after an external write waits for the index to return it: EDGE indexes a feed append asynchronously. */
const EXTERNAL_WRITE_WAIT_MS = 5_000;
const EXTERNAL_WRITE_POLL_MS = 250;

const countBindingWrite = (feed: Feed.Feed): void => {
  bindingWrites.set(feed.id, (bindingWrites.get(feed.id) ?? 0) + 1);
};

export type BinderOptions = {
  feed: Feed.Feed;
  runtime: Context.Context<Database.Service>;
  /** @effect/atom-react Registry for reactive state management. */
  registry?: AtomRegistry.AtomRegistry;
  /** Holds bindings in memory until {@link Binder.flush}, so the feed need not be stored yet (a draft conversation). */
  hold?: boolean;
};

/**
 * Manages bindings of skills and objects to a conversation.
 */
export class Binder extends Resource {
  private readonly _skills = Atom.make<Skill.Skill[]>([]).pipe(Atom.keepAlive);
  private readonly _objects = Atom.make<Obj.Unknown[]>([]).pipe(Atom.keepAlive);
  private readonly _connections = Atom.make<ReadonlyMap<URI.URI, boolean>>(new Map()).pipe(Atom.keepAlive);
  private readonly _registry: AtomRegistry.AtomRegistry;
  private readonly _feed: Feed.Feed;
  private readonly _runtime: Context.Context<Database.Service>;
  private readonly _hold: boolean;

  #bindingsQuery: QueryResult.QueryResult<Binding> | undefined;

  /** {@link bindingWriteCount} at the last read of the bindings query. */
  #readWrites = 0;

  /** `externalBindingWrites`, this realm's writes to the feed, and the binding items at the last read of the query. */
  #readExternal = 0;
  #readLocal = 0;
  #readItems = 0;

  /**
   * Keys of the refs the feed already binds, whether or not their targets resolve here: a registry
   * skill bound by URI never matches its resolved target's URI, so the atoms alone cannot tell it is bound.
   */
  #bound = { skills: new Set<URI.URI>(), objects: new Set<URI.URI>() };

  #pending?: Binding[];

  /** Bumped by each held write, so only the latest resolution of the held bindings lands. */
  #heldGeneration = 0;

  constructor(options: BinderOptions) {
    super();
    assertArgument(options.feed, 'options.feed', 'Feed is required');
    assertArgument(options.runtime, 'options.runtime', 'Feed runtime is required');
    this._feed = options.feed;
    this._runtime = options.runtime;
    this._registry = options.registry ?? AtomEx.makeRegistry();
    this._hold = options.hold ?? false;
  }

  /**
   * Returns the skills atom for subscription.
   */
  get skills(): Atom.Atom<Skill.Skill[]> {
    return this._skills;
  }

  /**
   * Returns the objects atom for subscription.
   */
  get objects(): Atom.Atom<Obj.Unknown[]> {
    return this._objects;
  }

  /**
   * Connections the conversation has turned on (`true`) or off (`false`), keyed by local ECHO URI.
   * One absent from the map follows the space default.
   */
  get connections(): Atom.Atom<ReadonlyMap<URI.URI, boolean>> {
    return this._connections;
  }

  getConnections(): ReadonlyMap<URI.URI, boolean> {
    return this._registry.get(this._connections);
  }

  /**
   * Gets the current skills value.
   */
  getSkills(): Skill.Skill[] {
    return this._registry.get(this._skills);
  }

  /**
   * Gets the current objects value.
   */
  getObjects(): Obj.Unknown[] {
    return this._registry.get(this._objects);
  }

  /**
   * Subscribe to changes in skills.
   */
  subscribeSkills(cb: (skills: Skill.Skill[]) => void): () => void {
    return this._registry.subscribe(this._skills, () => cb(this._registry.get(this._skills)));
  }

  /**
   * Subscribe to changes in objects.
   */
  subscribeObjects(cb: (objects: Obj.Unknown[]) => void): () => void {
    return this._registry.subscribe(this._objects, () => cb(this._registry.get(this._objects)));
  }

  /**
   * Subscribe to changes in connection states.
   */
  subscribeConnections(cb: (connections: ReadonlyMap<URI.URI, boolean>) => void): () => void {
    return this._registry.subscribe(this._connections, () => cb(this._registry.get(this._connections)));
  }

  protected override async _open(): Promise<void> {
    if (this._hold) {
      this.#pending = [];
      return;
    }
    await this._follow();
  }

  /**
   * Writes a holding binder's bindings to its feed, which the caller has stored, as one binding. Later
   * writes go straight to the feed, which the binder does not follow.
   */
  async flush(): Promise<void> {
    const held = this.#pending;
    if (!held) {
      return;
    }
    invariant(Obj.getDatabase(this._feed), 'The feed must be stored before its bindings are flushed.');
    this.#pending = undefined;
    const { skills, objects } = reduce(held);
    const connections = connectionChanges(held);
    if (skills.size > 0 || objects.size > 0 || connections.added.length > 0 || connections.removed.length > 0) {
      await this._append(
        Obj.make(Binding, {
          skills: { added: [...skills], removed: [] },
          objects: { added: [...objects], removed: [] },
          connections,
        }),
      );
    }
  }

  private async _follow(): Promise<void> {
    const bindingsQuery = await RuntimeProvider.runPromise(Effect.succeed(this._runtime))(
      Feed.query(this._feed, Query.type(Binding)),
    );
    this.#bindingsQuery = bindingsQuery;

    // Process initial state before returning.
    this.#readWrites = bindingWriteCount(this._feed);
    this.#readExternal = externalBindingWrites;
    this.#readLocal = bindingWrites.get(this._feed.id) ?? 0;
    const initialResults = await bindingsQuery.run();
    this.#readItems = initialResults.length;
    await this._updateBindings(initialResults);

    // Subscribe to future changes.
    this._ctx.onDispose(
      bindingsQuery.subscribe(async () => {
        await this._updateBindings(bindingsQuery.results);
      }),
    );
  }

  /**
   * Re-reads bindings from the feed to pick up changes made by other processes in this realm, such
   * as a tool that bound a skill. A no-op when none has been written since the last read.
   */
  async sync(): Promise<void> {
    const writes = bindingWriteCount(this._feed);
    const external = externalBindingWrites;
    if (this.#bindingsQuery && writes !== this.#readWrites) {
      // A write noted from another process is in the feed but may not be indexed yet, so a read that returns no
      // new item is retried until it does or the wait runs out.
      const awaitingExternal = external !== this.#readExternal;
      const deadline = Date.now() + (awaitingExternal ? EXTERNAL_WRITE_WAIT_MS : 0);
      let results: Binding[];
      try {
        results = await this.#bindingsQuery.run();
      } catch (error) {
        // The query's live subscription already keeps the bindings current, so a re-read that fails
        // (an index query timing out under load) costs freshness, not correctness — and a caller
        // running this between agent turns would otherwise fail the whole agent process on it.
        log.warn('bindings sync failed; keeping the current bindings', { error });
        return;
      }
      // Every write appends one item, so the read holds a noted external write once it has grown past this realm's
      // own writes that no earlier read has returned.
      const local = bindingWrites.get(this._feed.id) ?? 0;
      const pendingLocal = local - this.#readLocal;
      const expected = this.#readItems + pendingLocal + (awaitingExternal ? 1 : 0);
      while (results.length < expected && Date.now() < deadline) {
        await EffectEx.runPromise(Effect.sleep(EXTERNAL_WRITE_POLL_MS));
        const remaining = deadline - Date.now();
        if (remaining <= 0) {
          break;
        }
        // A retry gets only the time left, so a slow index cannot hold the sync past the deadline; one that fails
        // keeps what the first read returned and leaves the writes unread, so the next sync retries them.
        const retry = await this.#bindingsQuery.run({ timeout: remaining }).catch((error) => {
          log.warn('bindings retry failed; keeping the write pending', { error });
          return undefined;
        });
        if (!retry) {
          await this._updateBindings(results);
          return;
        }
        results = retry;
      }
      log('sync', { bindingItems: results.length });
      await this._updateBindings(results);
      // Only after the update lands, so one that fails is retried by the next sync. A local write counts as read
      // only once the read has grown to hold it; one still unindexed keeps the next sync reading.
      const creditedLocal = Math.min(pendingLocal, Math.max(0, results.length - this.#readItems));
      this.#readLocal += creditedLocal;
      if (creditedLocal === pendingLocal) {
        this.#readWrites = writes;
      }
      this.#readExternal = external;
      this.#readItems = results.length;
      log('sync complete', {
        skills: this._registry.get(this._skills).length,
        // Read the meta key directly: `Skill.getKey` throws on a space-authored skill, which would
        // make a diagnostic log the thing that breaks the sync.
        skillKeys: this._registry.get(this._skills).map((skill) => Obj.getMeta(skill).key),
      });
    }
  }

  private async _updateBindings(items: Binding[]): Promise<void> {
    // Skip update if no items - preserve existing state set by bind().
    if (items.length === 0) {
      return;
    }

    const ordered = inAppendOrder(items);
    this._registry.set(this._connections, connectionStates(ordered));
    const bindings = reduce(ordered);
    this.#bound = {
      skills: new Set([...bindings.skills].map((ref) => refKey(ref.uri))),
      objects: new Set([...bindings.objects].map((ref) => refKey(ref.uri))),
    };

    log('_updateBindings', {
      items: items.length,
      skillRefs: [...bindings.skills].map((ref) => ({ uri: ref.uri, available: ref.isAvailable })),
    });

    // Resolve references (loading them first if needed).
    const currentSkills = this._registry.get(this._skills);
    const currentObjects = this._registry.get(this._objects);
    const resolvedSkills = await this._resolve(bindings.skills, currentSkills);
    const resolvedObjects = await this._resolve(bindings.objects, currentObjects);

    log('_updateBindings resolved', {
      resolvedSkills: resolvedSkills.length,
      resolvedSkillKeys: resolvedSkills.map((bp) => Obj.getMeta(bp).key ?? '<missing>'),
    });

    // Filter current state to only items still in the reduced binding set,
    // then merge in newly resolved items. This ensures unbind events are respected.
    const reducedSkillDxns = new Set<URI.URI>([...bindings.skills].map((ref) => ref.uri));
    const reducedObjectDxns = new Set<URI.URI>([...bindings.objects].map((ref) => ref.uri));
    const filteredSkills = currentSkills.filter((obj) => {
      const uri = Obj.getURI(obj);
      return uri != null && reducedSkillDxns.has(uri);
    });
    const filteredObjects = currentObjects.filter((obj) => {
      const uri = Obj.getURI(obj);
      return uri != null && reducedObjectDxns.has(uri);
    });
    const mergedSkills = this._mergeInto(filteredSkills, resolvedSkills);
    const mergedObjects = this._mergeInto(filteredObjects, resolvedObjects);

    this._registry.set(this._skills, mergedSkills);
    this._registry.set(this._objects, mergedObjects);

    log('updated bindings', {
      skills: mergedSkills.length,
      objects: mergedObjects.length,
    });
  }

  protected override async _close(): Promise<void> {
    // Reset atoms to empty state.
    this._registry.set(this._skills, []);
    this._registry.set(this._objects, []);
    this._registry.set(this._connections, new Map());
  }

  async bind({ skills, objects }: BindingProps): Promise<void> {
    const currentSkills = this._registry.get(this._skills);
    const currentObjects = this._registry.get(this._objects);

    const { added: addedSkills, next: nextSkills } = this._processBindings(skills, currentSkills, this.#bound.skills);
    const { added: addedObjects, next: nextObjects } = this._processBindings(
      objects,
      currentObjects,
      this.#bound.objects,
    );
    if (!addedSkills.length && !addedObjects.length) {
      return;
    }
    addedSkills.forEach((ref) => this.#bound.skills.add(refKey(ref.uri)));
    addedObjects.forEach((ref) => this.#bound.objects.add(refKey(ref.uri)));

    // Atomic updates - subscribers notified automatically.
    this._registry.set(this._skills, nextSkills);
    this._registry.set(this._objects, nextObjects);

    log('bind', { skills: addedSkills.length, objects: addedObjects.length });
    await this._write(
      Obj.make(Binding, {
        skills: {
          added: addedSkills,
          removed: [],
        },
        objects: {
          added: addedObjects,
          removed: [],
        },
      }),
    );
  }

  async unbind({ skills, objects }: BindingProps): Promise<void> {
    if (!skills?.length && !objects?.length) {
      return;
    }

    (skills ?? []).forEach((ref) => this.#bound.skills.delete(refKey(ref.uri)));
    (objects ?? []).forEach((ref) => this.#bound.objects.delete(refKey(ref.uri)));

    // Immediately update atom state so removals are reflected before the queue round-trips.
    const removedSkillKeys = new Set((skills ?? []).map((ref) => refKey(ref.uri)));
    const removedObjectKeys = new Set((objects ?? []).map((ref) => refKey(ref.uri)));
    if (removedSkillKeys.size > 0) {
      const current = this._registry.get(this._skills);
      this._registry.set(
        this._skills,
        current.filter((obj) => !removedSkillKeys.has(refKey(Obj.getURI(obj)))),
      );
    }
    if (removedObjectKeys.size > 0) {
      const current = this._registry.get(this._objects);
      this._registry.set(
        this._objects,
        current.filter((obj) => !removedObjectKeys.has(refKey(Obj.getURI(obj)))),
      );
    }

    log('unbind', { skills: skills?.length, objects: objects?.length });
    await this._write(
      Obj.make(Binding, {
        skills: {
          added: [],
          removed: skills ?? [],
        },
        objects: {
          added: [],
          removed: objects ?? [],
        },
      }),
    );
  }

  /** Turns a connection's MCP server on or off for this conversation. */
  async setConnection(connection: Ref.Ref<Obj.Unknown>, enabled: boolean): Promise<void> {
    const key = refKey(connection.uri);
    if (this.getConnections().get(key) === enabled) {
      return;
    }
    this._registry.set(this._connections, new Map([...this.getConnections(), [key, enabled]]));
    await this._write(
      Obj.make(Binding, {
        skills: { added: [], removed: [] },
        objects: { added: [], removed: [] },
        connections: enabled ? { added: [connection], removed: [] } : { added: [], removed: [connection] },
      }),
    );
  }

  private async _write(binding: Binding): Promise<void> {
    if (this.#pending) {
      this.#pending.push(binding);
      await this._resolveHeld(this.#pending);
      return;
    }
    await this._append(binding);
  }

  /**
   * Sets the atoms from the held bindings. Their refs have no feed query to hydrate them, so each is
   * resolved against the database, which also spans the registry.
   */
  private async _resolveHeld(held: Binding[]): Promise<void> {
    const generation = ++this.#heldGeneration;
    const { db } = Context.get(this._runtime, Database.Service);
    const { skills, objects } = reduce(held);
    const hydrate = <T extends Obj.Unknown>(refs: Iterable<Ref.Ref<T>>): Ref.Ref<T>[] =>
      [...refs].map((ref) => (ref.isAvailable ? ref : db.makeRef<T>(ref.uri)));
    const [resolvedSkills, resolvedObjects] = await Promise.all([
      this._resolve(hydrate(skills), this._registry.get(this._skills)),
      this._resolve(hydrate(objects), this._registry.get(this._objects)),
    ]);
    if (generation !== this.#heldGeneration) {
      return;
    }
    this._registry.set(this._connections, connectionStates(held));
    this._registry.set(this._skills, resolvedSkills);
    this._registry.set(this._objects, resolvedObjects);
  }

  private async _append(binding: Binding): Promise<void> {
    await RuntimeProvider.runPromise(Effect.succeed(this._runtime))(Feed.append(this._feed, [binding]));
    countBindingWrite(this._feed);
  }

  /**
   * Process bindings to filter duplicates (against the resolved targets and the refs already bound) and
   * determine next state.
   */
  private _processBindings<T extends Obj.Unknown>(
    refs: Ref.Ref<T>[] | undefined,
    current: T[],
    bound: ReadonlySet<URI.URI>,
  ): { added: Ref.Ref<T>[]; next: T[] } {
    const next = [...current];
    const added: Ref.Ref<T>[] = [];
    if (!refs?.length) {
      return { added, next };
    }

    const seen = new Set<URI.URI>([...bound, ...current.map((obj) => refKey(Obj.getURI(obj)))]);
    for (const ref of refs) {
      const key = refKey(ref.uri);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      added.push(ref);

      // Only resolve target if available (has target or resolver).
      if (ref.isAvailable) {
        const target = ref.target;
        if (target) {
          next.push(target);
        }
      }
    }

    return { added, next };
  }

  /**
   * Merge resolved items into the current set, adding only items not already present (by DXN).
   */
  private _mergeInto<T extends Obj.Unknown>(current: T[], resolved: T[]): T[] {
    const seen = new Set(current.map((obj) => Obj.getURI(obj)));
    const merged = [...current];
    for (const obj of resolved) {
      const uri = Obj.getURI(obj);
      if (!seen.has(uri)) {
        seen.add(uri);
        merged.push(obj);
      }
    }
    return merged;
  }

  /**
   * Resolve references to objects, loading them first if needed and falling back to existing objects.
   * DXN refs (e.g. `dxn:org.dxos.skill.database`) resolve via the wired-up ECHO ref resolver
   * which already spans both the space DB and the hypergraph registry.
   */
  private async _resolve<T extends Obj.Unknown>(refs: Iterable<Ref.Ref<T>>, current: T[]): Promise<T[]> {
    const refArray = [...refs];

    // Load all refs that need loading.
    await Promise.all(refArray.map((ref) => ref.tryLoad()));

    return refArray
      .map((ref) => {
        let target: T | undefined;
        // Only resolve target if available (has target or resolver).
        if (ref.isAvailable) {
          target = ref.target;
        }

        // Fallback to existing object.
        const resolved = target ?? current.find((obj) => Obj.getURI(obj) === ref.uri);
        if (!resolved) {
          // A binding that cannot load (e.g. a registry skill the host never registered) would otherwise
          // vanish from the session without trace.
          log.warn('unresolved context binding', { uri: ref.uri });
        }
        return resolved;
      })
      .filter(isNonNullable);
  }
}

/**
 * Reduces bindings into the sets of skills and objects they leave bound.
 *
 * Order-sensitive: a later removal must fold after the addition it undoes, so callers pass items
 * in append order (see {@link inAppendOrder}).
 */
const reduce = (items: Binding[]): Bindings =>
  Function.pipe(
    items,
    EArray.reduce(new Bindings(), (context, { skills, objects }) => {
      skills.added.forEach((ref) => context.skills.add(ref));
      skills.removed.forEach((ref) => context.skills.delete(ref));

      objects.added.forEach((ref) => context.objects.add(ref));
      objects.removed.forEach((ref) => {
        const removedId = entityIdOf(ref.uri);
        for (const obj of context.objects) {
          if (obj.uri === ref.uri || (removedId !== undefined && entityIdOf(obj.uri) === removedId)) {
            context.objects.delete(obj);
          }
        }
      });

      return context;
    }),
  );

/**
 * Each connection a conversation has turned on or off, keyed by local ECHO URI; the latest binding
 * that names it wins. Callers pass items in append order (see {@link inAppendOrder}).
 */
export const connectionStates = (items: readonly Binding[]): ReadonlyMap<URI.URI, boolean> => {
  const states = new Map<URI.URI, boolean>();
  for (const { connections } of items) {
    connections?.added.forEach((ref) => states.set(refKey(ref.uri), true));
    connections?.removed.forEach((ref) => states.set(refKey(ref.uri), false));
  }
  return states;
};

/**
 * Whether a connection's MCP server is on in a conversation with these states. A space's connection
 * is on unless turned off; a built-in server (keyed in the registry) is off unless turned on.
 */
export const isConnectionOn = (states: ReadonlyMap<URI.URI, boolean>, connection: Obj.Unknown): boolean =>
  states.get(connectionKey(connection)) ?? Obj.getMeta(connection).key === undefined;

/**
 * The ref a binding records a connection by. A built-in server is a registry object made afresh in
 * each process, so it is named by its key, which every process shares.
 */
export const connectionRef = (connection: Obj.Unknown): Ref.Ref<Obj.Unknown> =>
  Obj.getMeta(connection).key !== undefined
    ? Ref.fromURI(Obj.getURI(connection, { prefer: 'named' }))
    : Ref.make(connection);

const connectionKey = (connection: Obj.Unknown): URI.URI => refKey(connectionRef(connection).uri);

/** The net connection changes of held bindings, as one binding writes them. */
const connectionChanges = (
  items: readonly Binding[],
): { added: Ref.Ref<Obj.Unknown>[]; removed: Ref.Ref<Obj.Unknown>[] } => {
  const latest = new Map<URI.URI, { ref: Ref.Ref<Obj.Unknown>; enabled: boolean }>();
  for (const { connections } of items) {
    connections?.added.forEach((ref) => latest.set(refKey(ref.uri), { ref, enabled: true }));
    connections?.removed.forEach((ref) => latest.set(refKey(ref.uri), { ref, enabled: false }));
  }
  const changes = [...latest.values()];
  return {
    added: changes.filter(({ enabled }) => enabled).map(({ ref }) => ref),
    removed: changes.filter(({ enabled }) => !enabled).map(({ ref }) => ref),
  };
};

/**
 * The connections a conversation's feed has turned on or off, read once (see {@link connectionStates}).
 */
export const boundConnections = (
  feed: Feed.Feed,
): Effect.Effect<ReadonlyMap<URI.URI, boolean>, never, Database.Service> =>
  Feed.query(feed, Query.type(Binding)).run.pipe(Effect.map((items) => connectionStates(inAppendOrder(items))));

/**
 * The objects a conversation's feed currently binds, read once: for a reader that needs the bound
 * set at one moment without holding a {@link Binder} open.
 */
export const boundObjects = (feed: Feed.Feed): Effect.Effect<Ref.Ref<Obj.Unknown>[], never, Database.Service> =>
  Feed.query(feed, Query.type(Binding)).run.pipe(Effect.map((items) => [...reduce(inAppendOrder(items)).objects]));

/** The entity id an ECHO URI names; none for any other URI. */
const entityIdOf = (uri: URI.URI): string | undefined => {
  const echoUri = EID.tryParse(uri);
  return echoUri ? EID.getEntityId(echoUri) : undefined;
};

/**
 * Identity of a bound ref: an ECHO URI compares in its local form, since some carry the space and some do not.
 */
const refKey = (uri: URI.URI): URI.URI => {
  const echoUri = EID.tryParse(uri);
  return echoUri ? EID.toLocal(echoUri) : uri;
};

/**
 * Bindings in the order they were appended, which is the order the fold has to see them: a query
 * returns an unordered set, so an unsorted fold can apply a removal before the addition it undoes
 * and silently keep the object bound. Server-assigned position is authoritative; a locally-written
 * block has none yet and sorts last, which is correct — it is the newest.
 */
const inAppendOrder = (items: readonly Binding[]): Binding[] =>
  EArray.sort(items, Order.mapInput(Order.Number, Feed.getPosition));
