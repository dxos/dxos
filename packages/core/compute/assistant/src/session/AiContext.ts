//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { Atom, Registry as AtomRegistry } from '@effect-atom/atom-react';
import * as EArray from 'effect/Array';
import * as Function from 'effect/Function';
import * as Runtime from 'effect/Runtime';
import * as Schema from 'effect/Schema';

import { Blueprint } from '@dxos/compute';
import { Resource } from '@dxos/context';
import { Annotation, Database, DXN, Feed, Obj, type QueryResult, Query, Ref, Type } from '@dxos/echo';
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
}).pipe(Annotation.HiddenAnnotation.set(true), Type.makeObject(DXN.make('org.dxos.type.contextBinding', '0.1.0')));

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
  runtime: Runtime.Runtime<Database.Service>;
  /** @effect-atom/atom-react Registry for reactive state management. */
  registry?: AtomRegistry.Registry;
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
  private readonly _runtime: Runtime.Runtime<Database.Service>;

  #bindingsQuery: QueryResult.QueryResult<Binding> | undefined;

  constructor(options: BinderOptions) {
    super();
    assertArgument(options.feed, 'options.feed', 'Feed is required');
    assertArgument(options.runtime, 'options.runtime', 'Feed runtime is required');
    this._feed = options.feed;
    this._runtime = options.runtime;
    this._registry = options.registry ?? AtomRegistry.make();
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
      return uri != null && reducedBlueprintDxns.has(uri) && Obj.getMeta(obj).key !== undefined;
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
    for (const ref of refs) {
      const uri = ref.uri;
      if (seen.has(uri)) {
        continue;
      }
      seen.add(uri);
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
   * DXN refs (e.g. `dxn:org.dxos.blueprint.database`) resolve via the wired-up ECHO ref resolver
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
        return target ?? current.find((obj) => Obj.getURI(obj) === ref.uri);
      })
      .filter(isNonNullable);
  }
}
