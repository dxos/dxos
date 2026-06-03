//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { Atom, Registry as AtomRegistry } from '@effect-atom/atom-react';
import * as EArray from 'effect/Array';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Runtime from 'effect/Runtime';
import * as Schema from 'effect/Schema';

import { Blueprint } from '@dxos/compute';
import { Resource } from '@dxos/context';
import { DXN, Entity, Filter, Feed, Obj, type QueryResult, Query, Ref, Registry, Type } from '@dxos/echo';
import { assertArgument } from '@dxos/invariant';
import { EID, type URI } from '@dxos/keys';
import { log } from '@dxos/log';
import { ComplexSet, isNonNullable } from '@dxos/util';

/**
 * Thread message that binds or unbinds contextual objects to a conversation.
 */
export const Binding = Schema.Struct({
  blueprints: Schema.Struct({
    added: Schema.Array(Ref.Ref(Blueprint.Blueprint)),
    removed: Schema.Array(Ref.Ref(Blueprint.Blueprint)),
  }),

  objects: Schema.Struct({
    added: Schema.Array(Ref.Ref(Obj.Unknown)),
    removed: Schema.Array(Ref.Ref(Obj.Unknown)),
  }),
}).pipe(Type.makeObject(DXN.make('org.dxos.type.contextBinding', '0.1.0')));

export type Binding = Type.InstanceType<typeof Binding>;
export type BindingProps = Partial<{
  blueprints: Ref.Ref<Blueprint.Blueprint>[];
  objects: Ref.Ref<Obj.Unknown>[];
}>;

export class Bindings {
  readonly blueprints = new ComplexSet<Ref.Ref<Blueprint.Blueprint>>((ref) => ref.uri);

  // TODO(burdon): Some DXNs have the Space prefix so only compare the object ID.
  readonly objects = new ComplexSet<Ref.Ref<Obj.Unknown>>((ref) => {
    const echoUri = EID.tryParse(ref.uri);
    return echoUri ? EID.getEntityId(echoUri) : undefined;
  });

  toJSON(): { blueprints: URI.URI[]; objects: URI.URI[] } {
    return {
      blueprints: EArray.fromIterable(this.blueprints).map((ref) => ref.uri),
      objects: EArray.fromIterable(this.objects).map((ref) => ref.uri),
    };
  }
}

export type BinderOptions = {
  feed: Feed.Feed;
  runtime: Runtime.Runtime<Feed.FeedService>;
  /** @effect-atom/atom-react Registry for reactive state management. */
  registry?: AtomRegistry.Registry;
  /** @dxos/echo Registry used to resolve blueprint refs without DB copies. */
  echoRegistry?: Registry.Registry;
};

/**
 * Manages bindings of blueprints and objects to a conversation.
 */
// TODO(burdon): Context should manage ephemeral state of bindings until prompt is issued?
export class Binder extends Resource {
  private readonly _blueprints = Atom.make<Blueprint.Blueprint[]>([]).pipe(Atom.keepAlive);
  private readonly _objects = Atom.make<Obj.Unknown[]>([]).pipe(Atom.keepAlive);
  private readonly _registry: AtomRegistry.Registry;
  private readonly _feed: Feed.Feed;
  private readonly _runtime: Runtime.Runtime<Feed.FeedService>;
  readonly #echoRegistry: Registry.Registry | undefined;

  #bindingsQuery: QueryResult.QueryResult<Binding> | undefined;

  constructor(options: BinderOptions) {
    super();
    assertArgument(options.feed, 'options.feed', 'Feed is required');
    assertArgument(options.runtime, 'options.runtime', 'Feed runtime is required');
    this._feed = options.feed;
    this._runtime = options.runtime;
    this._registry = options.registry ?? AtomRegistry.make();
    this.#echoRegistry = options.echoRegistry;
  }

  /**
   * Returns the blueprints atom for subscription.
   */
  get blueprints(): Atom.Atom<Blueprint.Blueprint[]> {
    return this._blueprints;
  }

  /**
   * Returns the objects atom for subscription.
   */
  get objects(): Atom.Atom<Obj.Unknown[]> {
    return this._objects;
  }

  /**
   * Gets the current blueprints value.
   */
  getBlueprints(): Blueprint.Blueprint[] {
    return this._registry.get(this._blueprints);
  }

  /**
   * Gets the current objects value.
   */
  getObjects(): Obj.Unknown[] {
    return this._registry.get(this._objects);
  }

  /**
   * Subscribe to changes in blueprints.
   */
  subscribeBlueprints(cb: (blueprints: Blueprint.Blueprint[]) => void): () => void {
    return this._registry.subscribe(this._blueprints, () => cb(this._registry.get(this._blueprints)));
  }

  /**
   * Subscribe to changes in objects.
   */
  subscribeObjects(cb: (objects: Obj.Unknown[]) => void): () => void {
    return this._registry.subscribe(this._objects, () => cb(this._registry.get(this._objects)));
  }

  protected override async _open(): Promise<void> {
    this.#bindingsQuery = await Runtime.runPromise(this._runtime)(Feed.query(this._feed, Query.type(Binding)));

    // Process initial state before returning.
    const initialResults = await this.#bindingsQuery.run();
    await this._updateBindings(initialResults);

    // Subscribe to future changes.
    this._ctx.onDispose(
      this.#bindingsQuery.subscribe(async () => {
        await this._updateBindings(this.#bindingsQuery!.results);
      }),
    );
  }

  /**
   * Re-reads bindings from the feed to pick up changes made by other processes.
   */
  async sync(): Promise<void> {
    if (this.#bindingsQuery) {
      const results = await this.#bindingsQuery.run();
      log('sync', { bindingItems: results.length });
      await this._updateBindings(results);
      log('sync complete', {
        blueprints: this._registry.get(this._blueprints).length,
        blueprintKeys: this._registry.get(this._blueprints).map((bp) => Blueprint.getKey(bp)),
      });
    }
  }

  private async _updateBindings(items: Binding[]): Promise<void> {
    // Skip update if no items - preserve existing state set by bind().
    if (items.length === 0) {
      return;
    }

    const bindings = this._reduce(items);

    log('_updateBindings', {
      items: items.length,
      blueprintRefs: [...bindings.blueprints].map((ref) => ({ uri: ref.uri, available: ref.isAvailable })),
    });

    // Resolve references (loading them first if needed).
    const currentBlueprints = this._registry.get(this._blueprints);
    const currentObjects = this._registry.get(this._objects);
    const resolvedBlueprints = await this._resolve(bindings.blueprints, currentBlueprints);
    const resolvedObjects = await this._resolve(bindings.objects, currentObjects);

    log('_updateBindings resolved', {
      resolvedBlueprints: resolvedBlueprints.length,
      resolvedBlueprintKeys: resolvedBlueprints.map((bp) => Obj.getMeta(bp).key ?? '<missing>'),
    });

    // Drop blueprints that have no registry key — they cannot be used downstream
    // (e.g. tool/operation registration calls Blueprint.getKey which throws).
    const keyedBlueprints = resolvedBlueprints.filter((bp) => {
      if (Obj.getMeta(bp).key === undefined) {
        log.warn('dropping blueprint with no meta key', { uri: Obj.getURI(bp) });
        return false;
      }
      return true;
    });

    // Filter current state to only items still in the reduced binding set,
    // then merge in newly resolved items. This ensures unbind events are respected.
    const reducedBlueprintDxns = new Set<URI.URI>([...bindings.blueprints].map((ref) => ref.uri));
    const reducedObjectDxns = new Set<URI.URI>([...bindings.objects].map((ref) => ref.uri));
    const filteredBlueprints = currentBlueprints.filter((obj) => {
      const uri = Obj.getURI(obj);
      const key = Obj.getMeta(obj).key;
      // Match by echo URI (DB-backed) or by meta key (registry-backed, where the ref URI is the key).
      const matched =
        (uri != null && reducedBlueprintDxns.has(uri)) || (key != null && reducedBlueprintDxns.has(key as URI.URI));
      return matched && key !== undefined;
    });
    const filteredObjects = currentObjects.filter((obj) => {
      const uri = Obj.getURI(obj);
      return uri != null && reducedObjectDxns.has(uri);
    });
    const mergedBlueprints = this._mergeInto(filteredBlueprints, keyedBlueprints);
    const mergedObjects = this._mergeInto(filteredObjects, resolvedObjects);

    this._registry.set(this._blueprints, mergedBlueprints);
    this._registry.set(this._objects, mergedObjects);

    log('updated bindings', {
      blueprints: mergedBlueprints.length,
      objects: mergedObjects.length,
    });
  }

  protected override async _close(): Promise<void> {
    // Reset atoms to empty state.
    this._registry.set(this._blueprints, []);
    this._registry.set(this._objects, []);
  }

  async bind({ blueprints, objects }: BindingProps): Promise<void> {
    const currentBlueprints = this._registry.get(this._blueprints);
    const currentObjects = this._registry.get(this._objects);

    const { added: addedBlueprints, next: nextBlueprints } = this._processBindings(blueprints, currentBlueprints);
    const { added: addedObjects, next: nextObjects } = this._processBindings(objects, currentObjects);
    if (!addedBlueprints.length && !addedObjects.length) {
      return;
    }

    // Atomic updates - subscribers notified automatically.
    this._registry.set(this._blueprints, nextBlueprints);
    this._registry.set(this._objects, nextObjects);

    log('bind', { blueprints: addedBlueprints.length, objects: addedObjects.length });
    await Runtime.runPromise(this._runtime)(
      Feed.append(this._feed, [
        Obj.make(Binding, {
          blueprints: {
            added: addedBlueprints,
            removed: [],
          },
          objects: {
            added: addedObjects,
            removed: [],
          },
        }),
      ]),
    );
  }

  async unbind({ blueprints, objects }: BindingProps): Promise<void> {
    if (!blueprints?.length && !objects?.length) {
      return;
    }

    // Immediately update atom state so removals are reflected before the queue round-trips.
    const removedBlueprintDxns = (blueprints ?? []).map((ref) => ref.uri);
    const removedObjectDxns = (objects ?? []).map((ref) => ref.uri);
    if (removedBlueprintDxns.length > 0) {
      const current = this._registry.get(this._blueprints);
      this._registry.set(
        this._blueprints,
        current.filter((obj) => !removedBlueprintDxns.some((uri) => Obj.getURI(obj) === uri)),
      );
    }
    if (removedObjectDxns.length > 0) {
      const current = this._registry.get(this._objects);
      this._registry.set(
        this._objects,
        current.filter((obj) => !removedObjectDxns.some((uri) => Obj.getURI(obj) === uri)),
      );
    }

    log('unbind', { blueprints: blueprints?.length, objects: objects?.length });
    await Runtime.runPromise(this._runtime)(
      Feed.append(this._feed, [
        Obj.make(Binding, {
          blueprints: {
            added: [],
            removed: blueprints ?? [],
          },
          objects: {
            added: [],
            removed: objects ?? [],
          },
        }),
      ]),
    );
  }

  /**
   * Process bindings to filter duplicates and determine next state.
   */
  private _processBindings<T extends Obj.Unknown>(
    refs: Ref.Ref<T>[] | undefined,
    current: T[],
  ): { added: Ref.Ref<T>[]; next: T[] } {
    const next = [...current];
    const added: Ref.Ref<T>[] = [];
    if (!refs?.length) {
      return { added, next };
    }

    const seen = new Set<URI.URI>(current.map((obj) => Obj.getURI(obj)));
    // Also index current items by meta key so registry refs don't duplicate DB refs.
    const seenByKey = new Set<string>(
      current.map((obj) => Entity.getMeta(obj)?.key).filter((k): k is string => k != null),
    );
    for (const ref of refs) {
      const uri = ref.uri;
      if (seen.has(uri)) {
        continue;
      }
      seen.add(uri);
      added.push(ref);

      // Resolve target: prefer inlined target, then echo registry lookup by key URI.
      if (ref.isAvailable) {
        const target = ref.target;
        if (target) {
          const key = Entity.getMeta(target)?.key;
          if (!key || !seenByKey.has(key)) {
            if (key) {seenByKey.add(key);}
            next.push(target);
          }
        }
      } else if (this.#echoRegistry) {
        // Registry-backed ref: URI is the blueprint meta key (not an echo:/ entity URI).
        const target = this.#resolveFromRegistry<T>(uri);
        if (target) {
          const key = Entity.getMeta(target)?.key;
          if (!key || !seenByKey.has(key)) {
            if (key) {seenByKey.add(key);}
            next.push(target);
          }
        }
      }
    }

    return { added, next };
  }

  /**
   * Look up an entity from the echo registry using a ref URI produced by {@link Blueprint.registryURI}.
   * Valid-DXN keys produce `dxn:<key>` URIs which the registry indexes directly;
   * invalid-DXN keys (hyphens in last segment) use the raw key as URI and fall back to a linear scan.
   */
  #resolveFromRegistry<T extends Obj.Unknown>(uri: URI.URI): T | undefined {
    if (!this.#echoRegistry) {return undefined;}
    // Fast O(1) path: try the URI directly (works when it's a `dxn:` URI).
    const byUri = this.#echoRegistry.getByURI(uri) as T | undefined;
    if (byUri) {return byUri;}
    // Fall back to linear meta.key scan for raw-key URIs (invalid DXN keys).
    return this.#echoRegistry
      .query(Filter.type(Blueprint.Blueprint))
      .runSync()
      .find((e) => Entity.getMeta(e)?.key === uri) as T | undefined;
  }

  /**
   * Reduce results into sets of blueprints and objects.
   */
  private _reduce(items: Binding[]): Bindings {
    return Function.pipe(
      items,
      EArray.reduce(new Bindings(), (context, { blueprints, objects }) => {
        blueprints.added.forEach((ref) => context.blueprints.add(ref));
        blueprints.removed.forEach((ref) => context.blueprints.delete(ref));

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
   */
  private async _resolve<T extends Obj.Unknown>(refs: Iterable<Ref.Ref<T>>, current: T[]): Promise<T[]> {
    const refArray = [...refs];

    // Load all refs that need loading.
    await Promise.all(refArray.map((ref) => ref.tryLoad()));

    return refArray
      .map((ref) => {
        let target: T | undefined;
        // Prefer inlined target or DB-resolved target.
        if (ref.isAvailable) {
          target = ref.target;
        }

        // Fallback 1: existing object matched by URI.
        if (!target) {
          target = current.find((obj) => Obj.getURI(obj) === ref.uri);
        }

        // Fallback 2: echo registry lookup for registry-backed refs whose URI is a meta key.
        if (!target && this.#echoRegistry) {
          target = this.#resolveFromRegistry<T>(ref.uri);
        }

        return target;
      })
      .filter(isNonNullable);
  }
}

export class Service extends Context.Tag('@dxos/assistant/AiContextService')<
  Service,
  {
    binder: Binder;
  }
>() {
  static bindContext = ({ blueprints, objects }: BindingProps): Effect.Effect<void, never, Service> =>
    Effect.gen(function* () {
      const { binder } = yield* Service;
      yield* Effect.promise(() => binder.bind({ blueprints, objects }));
    });

  static findObjects = <T extends Type.AnyObj>(type: T): Effect.Effect<Type.InstanceType<T>[], never, Service> => {
    return Effect.gen(function* () {
      const { binder } = yield* Service;
      return binder.getObjects().filter(Obj.instanceOf(type));
    });
  };
}
