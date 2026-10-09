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
import { type Context as DxContext, Resource } from '@dxos/context';
import { Database, DXN, Feed, Obj, Query, type QueryResult, Ref, Type } from '@dxos/echo';
import * as AtomEx from '@dxos/effect/AtomEx';
import * as RuntimeProvider from '@dxos/effect/RuntimeProvider';
import { assertArgument } from '@dxos/invariant';
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
  }),
) {}
export type BindingProps = Partial<{
  skills: Ref.Ref<Skill.Skill>[];
  objects: Ref.Ref<Obj.Unknown>[];
}>;

export class Bindings {
  readonly skills = new ComplexSet<Ref.Ref<Skill.Skill>>((ref) => ref.uri);

  // TODO(burdon): Some DXNs have the Space prefix so only compare the object ID.
  readonly objects = new ComplexSet<Ref.Ref<Obj.Unknown>>((ref) => {
    const echoUri = EID.tryParse(ref.uri);
    return echoUri ? EID.getEntityId(echoUri) : undefined;
  });

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

const bindingWriteCount = (feed: Feed.Feed): number => bindingWrites.get(feed.id) ?? 0;

const countBindingWrite = (feed: Feed.Feed): void => {
  bindingWrites.set(feed.id, (bindingWrites.get(feed.id) ?? 0) + 1);
};

export type BinderOptions = {
  feed: Feed.Feed;
  runtime: Context.Context<Database.Service>;
  /** @effect/atom-react Registry for reactive state management. */
  registry?: AtomRegistry.AtomRegistry;
};

/**
 * Manages bindings of skills and objects to a conversation.
 *
 * Over a feed not yet stored (a draft conversation), bindings are held in memory until {@link flush}.
 */
export class Binder extends Resource {
  private readonly _skills = Atom.make<Skill.Skill[]>([]).pipe(Atom.keepAlive);
  private readonly _objects = Atom.make<Obj.Unknown[]>([]).pipe(Atom.keepAlive);
  private readonly _registry: AtomRegistry.AtomRegistry;
  private readonly _feed: Feed.Feed;
  private readonly _runtime: Context.Context<Database.Service>;

  #bindingsQuery: QueryResult.QueryResult<Binding> | undefined;

  /** {@link bindingWriteCount} at the last read of the bindings query. */
  #readWrites = 0;

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

  protected override async _open(): Promise<void> {
    if (!Obj.getDatabase(this._feed)) {
      this.#pending = [];
      return;
    }
    await this._follow(this._ctx);
  }

  /**
   * Stores the feed if needed and writes the held bindings, which a failed write keeps for a retry; the
   * binder then follows the feed in the background. A no-op over a feed that was stored at open.
   */
  async flush(): Promise<void> {
    const held = this.#pending;
    if (!held) {
      return;
    }
    const ctx = this._ctx;
    const count = held.length;
    const { skills, objects } = this._reduce(held);
    if (!Obj.getDatabase(this._feed)) {
      await RuntimeProvider.runPromise(Effect.succeed(this._runtime))(Database.add(this._feed));
    }
    if (skills.size > 0 || objects.size > 0) {
      await this._append(
        Obj.make(Binding, {
          skills: { added: [...skills], removed: [] },
          objects: { added: [...objects], removed: [] },
        }),
      );
    }
    this.#pending = undefined;
    for (const binding of held.slice(count)) {
      await this._append(binding);
    }
    void this._follow(ctx).catch((error) => log.catch(error));
  }

  private async _follow(ctx: DxContext): Promise<void> {
    const bindingsQuery = await RuntimeProvider.runPromise(Effect.succeed(this._runtime))(
      Feed.query(this._feed, Query.type(Binding)),
    );
    if (ctx.disposed) {
      return;
    }
    this.#bindingsQuery = bindingsQuery;

    // Process initial state before returning.
    this.#readWrites = bindingWriteCount(this._feed);
    const initialResults = await bindingsQuery.run();
    await this._updateBindings(initialResults);

    // Subscribe to future changes.
    ctx.onDispose(
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
    if (this.#bindingsQuery && writes !== this.#readWrites) {
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
      log('sync', { bindingItems: results.length });
      await this._updateBindings(results);
      // Only after the update lands, so one that fails is retried by the next sync.
      this.#readWrites = writes;
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

    const bindings = this._reduce(inAppendOrder(items));
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
    const { skills, objects } = this._reduce(held);
    const hydrate = <T extends Obj.Unknown>(refs: Iterable<Ref.Ref<T>>): Ref.Ref<T>[] =>
      [...refs].map((ref) => (ref.isAvailable ? ref : db.makeRef<T>(ref.uri)));
    const [resolvedSkills, resolvedObjects] = await Promise.all([
      this._resolve(hydrate(skills), this._registry.get(this._skills)),
      this._resolve(hydrate(objects), this._registry.get(this._objects)),
    ]);
    if (generation !== this.#heldGeneration) {
      return;
    }
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
   * Reduce results into sets of skills and objects.
   *
   * Order-sensitive: a later removal must fold after the addition it undoes, so callers pass items
   * in append order (see {@link inAppendOrder}).
   */
  private _reduce(items: Binding[]): Bindings {
    return Function.pipe(
      items,
      EArray.reduce(new Bindings(), (context, { skills, objects }) => {
        skills.added.forEach((ref) => context.skills.add(ref));
        skills.removed.forEach((ref) => context.skills.delete(ref));

        objects.added.forEach((ref) => context.objects.add(ref));
        objects.removed.forEach((ref) => {
          for (const obj of context.objects) {
            if (
              obj.uri === ref.uri ||
              (EID.tryParse(obj.uri) &&
                EID.tryParse(ref.uri) &&
                EID.getEntityId(EID.tryParse(obj.uri)!) === EID.getEntityId(EID.tryParse(ref.uri)!))
            ) {
              context.objects.delete(obj);
            }
          }
        });

        return context;
      }),
    );
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
