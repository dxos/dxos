//
// Copyright 2025 DXOS.org
//

import { Atom, Registry } from '@effect-atom/atom-react';
import * as EArray from 'effect/Array';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Schema from 'effect/Schema';

import { Blueprint } from '@dxos/blueprints';
import { Resource } from '@dxos/context';
import { DXN, Obj, Query, type Ref, Type } from '@dxos/echo';
import { type Queue } from '@dxos/echo-db';
import { assertArgument } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ComplexSet, isTruthy } from '@dxos/util';

/**
 * Thread message that binds or unbinds contextual objects to a conversation.
 */
// TODO(burdon): Move to @dxos/schema ContentBlock?
export const ContextBinding = Schema.Struct({
  blueprints: Schema.Struct({
    added: Schema.Array(Type.Ref(Blueprint.Blueprint)),
    removed: Schema.Array(Type.Ref(Blueprint.Blueprint)),
  }),

  objects: Schema.Struct({
    added: Schema.Array(Type.Ref(Type.Obj)),
    removed: Schema.Array(Type.Ref(Type.Obj)),
  }),
}).pipe(
  Type.object({
    typename: 'dxos.org/type/ContextBinding',
    version: '0.1.0',
  }),
);

export interface ContextBinding extends Schema.Schema.Type<typeof ContextBinding> {}

export type BindingProps = Partial<{
  blueprints: Ref.Ref<Blueprint.Blueprint>[];
  objects: Ref.Ref<Obj.Unknown>[];
}>;

export class Bindings {
  readonly blueprints = new ComplexSet<Ref.Ref<Blueprint.Blueprint>>((ref) => ref.dxn.toString());

  // TODO(burdon): Some DXNs have the Space prefix so only compare the object ID.
  readonly objects = new ComplexSet<Ref.Ref<Obj.Unknown>>((ref) => ref.dxn.asEchoDXN()?.echoId);

  toJSON() {
    return {
      blueprints: EArray.fromIterable(this.blueprints).map((ref) => ref.dxn.toString()),
      objects: EArray.fromIterable(this.objects).map((ref) => ref.dxn.toString()),
    };
  }
}

export type AiContextBinderOptions = {
  queue: Queue;
  registry?: Registry.Registry;
};

/**
 * Manages bindings of blueprints and objects to a conversation.
 */
// TODO(burdon): Context should manage ephemeral state of bindings until prompt is issued?
export class AiContextBinder extends Resource {
  private readonly _blueprints = Atom.make<Blueprint.Blueprint[]>([]).pipe(Atom.keepAlive);
  private readonly _objects = Atom.make<Obj.Unknown[]>([]).pipe(Atom.keepAlive);
  private readonly _registry: Registry.Registry;
  private readonly _queue: Queue;

  constructor(options: AiContextBinderOptions) {
    super();
    assertArgument(options.queue, 'options.queue', 'Queue is required');
    this._queue = options.queue;
    this._registry = options.registry ?? Registry.make();
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
    const query = this._queue.query(Query.type(ContextBinding));

    // Process initial state before returning.
    const initialResults = await query.run();
    await this._updateBindings(initialResults);

    // Subscribe to future changes.
    this._ctx.onDispose(
      query.subscribe(async () => {
        await this._updateBindings(query.results);
      }),
    );
  }

  private async _updateBindings(items: ContextBinding[]): Promise<void> {
    // Skip update if no items - preserve existing state set by bind().
    if (items.length === 0) {
      return;
    }

    const bindings = this._reduce(items);

    // Resolve references (loading them first if needed).
    const currentBlueprints = this._registry.get(this._blueprints);
    const currentObjects = this._registry.get(this._objects);
    const newBlueprints = await this._resolve(bindings.blueprints, currentBlueprints);
    const newObjects = await this._resolve(bindings.objects, currentObjects);

    // Atomic updates - subscribers notified automatically.
    this._registry.set(this._blueprints, newBlueprints);
    this._registry.set(this._objects, newObjects);

    log('updated bindings', {
      blueprints: newBlueprints.length,
      objects: newObjects.length,
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
    await this._queue.append([
      Obj.make(ContextBinding, {
        blueprints: {
          added: addedBlueprints,
          removed: [],
        },
        objects: {
          added: addedObjects,
          removed: [],
        },
      }),
    ]);
  }

  async unbind({ blueprints, objects }: BindingProps): Promise<void> {
    if (!blueprints?.length && !objects?.length) {
      return;
    }

    log('unbind', { blueprints: blueprints?.length, objects: objects?.length });
    await this._queue.append([
      Obj.make(ContextBinding, {
        blueprints: {
          added: [],
          removed: blueprints ?? [],
        },
        objects: {
          added: [],
          removed: objects ?? [],
        },
      }),
    ]);
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

    const seen = new Set(current.map((obj) => Obj.getDXN(obj).toString()));
    for (const ref of refs) {
      const dxn = ref.dxn.toString();
      if (!seen.has(dxn)) {
        seen.add(dxn);
        added.push(ref);

        // Only resolve target if available (has target or resolver).
        if (ref.isAvailable) {
          const target = ref.target;
          if (target) {
            next.push(target);
          }
        }
      }
    }

    return { added, next };
  }

  /**
   * Reduce results into sets of blueprints and objects.
   */
  private _reduce(items: ContextBinding[]): Bindings {
    return Function.pipe(
      items,
      EArray.reduce(new Bindings(), (context, { blueprints, objects }) => {
        blueprints.added.forEach((ref) => context.blueprints.add(ref));
        blueprints.removed.forEach((ref) => context.blueprints.delete(ref));

        objects.added.forEach((ref) => context.objects.add(ref));
        objects.removed.forEach((ref) => {
          for (const obj of context.objects) {
            if (DXN.equalsEchoId(obj.dxn, ref.dxn)) {
              context.objects.delete(obj);
            }
          }
        });

        return context;
      }),
    );
  }

  /**
   * Resolve references to objects, loading them first if needed and falling back to existing objects.
   */
  private async _resolve<T>(refs: Iterable<Ref.Ref<T>>, current: T[]): Promise<T[]> {
    const refArray = [...refs];

    // Load all refs that need loading.
    await Promise.all(refArray.map((ref) => ref.load()));

    return refArray
      .map((ref) => {
        let target: T | undefined;
        // Only resolve target if available (has target or resolver).
        if (ref.isAvailable) {
          target = ref.target;
        }

        // Fallback to existing object.
        return target ?? current.find((obj) => Obj.getDXN(obj as any).toString() === ref.dxn.toString());
      })
      .filter(isTruthy);
  }
}

export class AiContextService extends Context.Tag('@dxos/assistant/AiContextService')<
  AiContextService,
  {
    binder: AiContextBinder;
  }
>() {
  static bindContext = ({ blueprints, objects }: BindingProps): Effect.Effect<void, never, AiContextService> =>
    Effect.gen(function* () {
      const { binder } = yield* AiContextService;
      yield* Effect.promise(() => binder.bind({ blueprints, objects }));
    });
}
