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

import { Skill } from '@dxos/compute';
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
  skills: Schema.Struct({
    added: Schema.Array(Ref.Ref(Skill.Skill)),
    removed: Schema.Array(Ref.Ref(Skill.Skill)),
  }),

  objects: Schema.Struct({
    added: Schema.Array(Ref.Ref(Obj.Unknown)),
    removed: Schema.Array(Ref.Ref(Obj.Unknown)),
  }),
}).pipe(Annotation.HiddenAnnotation.set(true), Type.makeObject(DXN.make('org.dxos.type.contextBinding', '0.1.0')));

export type Binding = Type.InstanceType<typeof Binding>;
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

export type BinderOptions = {
  feed: Feed.Feed;
  runtime: Runtime.Runtime<Database.Service>;
  /** @effect-atom/atom-react Registry for reactive state management. */
  registry?: AtomRegistry.Registry;
};

/**
 * Manages bindings of skills and objects to a conversation.
 */
// TODO(burdon): Context should manage ephemeral state of bindings until prompt is issued?
export class Binder extends Resource {
  private readonly _skills = Atom.make<Skill.Skill[]>([]).pipe(Atom.keepAlive);
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
        skills: this._registry.get(this._skills).length,
        skillKeys: this._registry.get(this._skills).map((bp) => Skill.getKey(bp)),
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

    // Drop skills that have no registry key — they cannot be used downstream
    // (e.g. tool/operation registration calls Skill.getKey which throws).
    const keyedSkills = resolvedSkills.filter((bp) => {
      if (Obj.getMeta(bp).key === undefined) {
        log.warn('dropping skill with no meta key', { uri: Obj.getURI(bp) });
        return false;
      }
      return true;
    });

    // Filter current state to only items still in the reduced binding set,
    // then merge in newly resolved items. This ensures unbind events are respected.
    const reducedSkillDxns = new Set<URI.URI>([...bindings.skills].map((ref) => ref.uri));
    const reducedObjectDxns = new Set<URI.URI>([...bindings.objects].map((ref) => ref.uri));
    const filteredSkills = currentSkills.filter((obj) => {
      const uri = Obj.getURI(obj);
      return uri != null && reducedSkillDxns.has(uri) && Obj.getMeta(obj).key !== undefined;
    });
    const filteredObjects = currentObjects.filter((obj) => {
      const uri = Obj.getURI(obj);
      return uri != null && reducedObjectDxns.has(uri);
    });
    const mergedSkills = this._mergeInto(filteredSkills, keyedSkills);
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

    const { added: addedSkills, next: nextSkills } = this._processBindings(skills, currentSkills);
    const { added: addedObjects, next: nextObjects } = this._processBindings(objects, currentObjects);
    if (!addedSkills.length && !addedObjects.length) {
      return;
    }

    // Atomic updates - subscribers notified automatically.
    this._registry.set(this._skills, nextSkills);
    this._registry.set(this._objects, nextObjects);

    log('bind', { skills: addedSkills.length, objects: addedObjects.length });
    await Runtime.runPromise(this._runtime)(
      Feed.append(this._feed, [
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
      ]),
    );
  }

  async unbind({ skills, objects }: BindingProps): Promise<void> {
    if (!skills?.length && !objects?.length) {
      return;
    }

    // Immediately update atom state so removals are reflected before the queue round-trips.
    const removedSkillDxns = (skills ?? []).map((ref) => ref.uri);
    const removedObjectDxns = (objects ?? []).map((ref) => ref.uri);
    if (removedSkillDxns.length > 0) {
      const current = this._registry.get(this._skills);
      this._registry.set(
        this._skills,
        current.filter((obj) => !removedSkillDxns.some((uri) => Obj.getURI(obj) === uri)),
      );
    }
    if (removedObjectDxns.length > 0) {
      const current = this._registry.get(this._objects);
      this._registry.set(
        this._objects,
        current.filter((obj) => !removedObjectDxns.some((uri) => Obj.getURI(obj) === uri)),
      );
    }

    log('unbind', { skills: skills?.length, objects: objects?.length });
    await Runtime.runPromise(this._runtime)(
      Feed.append(this._feed, [
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
   * Reduce results into sets of skills and objects.
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
        return target ?? current.find((obj) => Obj.getURI(obj) === ref.uri);
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
  static bindContext = ({ skills, objects }: BindingProps): Effect.Effect<void, never, Service> =>
    Effect.gen(function* () {
      const { binder } = yield* Service;
      yield* Effect.promise(() => binder.bind({ skills, objects }));
    });

  static findObjects = <T extends Type.AnyObj>(type: T): Effect.Effect<Type.InstanceType<T>[], never, Service> => {
    return Effect.gen(function* () {
      const { binder } = yield* Service;
      return binder.getObjects().filter(Obj.instanceOf(type));
    });
  };
}
