//
// Copyright 2025 DXOS.org
//

import { Signal } from '@preact/signals-core';
import * as EArray from 'effect/Array';
import * as Context from 'effect/Context';
import * as Function from 'effect/Function';
import * as Schema from 'effect/Schema';

import { Blueprint } from '@dxos/blueprints';
import { Resource } from '@dxos/context';
import { DXN, Obj, Query, type Ref, Type } from '@dxos/echo';
import { type Queue } from '@dxos/echo-db';
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
    added: Schema.Array(Type.Ref(Obj.source)),
    removed: Schema.Array(Type.Ref(Obj.source)),
  }),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/ContextBinding',
    version: '0.1.0',
  }),
);

export interface ContextBinding extends Schema.Schema.Type<typeof ContextBinding> {}

export type BindingProps = Partial<{
  blueprints: Ref.Ref<Blueprint.Blueprint>[];
  objects: Ref.Ref<Obj.source>[];
}>;

export class Bindings {
  readonly blueprints = new ComplexSet<Ref.Ref<Blueprint.Blueprint>>((ref) => ref.dxn.toString());

  // TODO(burdon): Some DXNs have the Space prefix so only compare the object ID.
  readonly objects = new ComplexSet<Ref.Ref<Obj.source>>((ref) => ref.dxn.asEchoDXN()?.echoId);

  toJSON() {
    return {
      blueprints: EArray.fromIterable(this.blueprints).map((ref) => ref.dxn.toString()),
      objects: EArray.fromIterable(this.objects).map((ref) => ref.dxn.toString()),
    };
  }
}

/**
 * Manages bindings of blueprints and objects to a conversation.
 */
// TODO(burdon): Context should manage ephemeral state of bindings until prompt is issued?
export class AiContextBinder extends Resource {
  private readonly _blueprints = new Signal<Blueprint.Blueprint[]>([]);
  private readonly _objects = new Signal<Obj.source[]>([]);

  constructor(private readonly _queue: Queue) {
    super();
  }

  get blueprints() {
    return this._blueprints;
  }

  get objects() {
    return this._objects;
  }

  protected override async _open(): Promise<void> {
    const query = this._queue.query(Query.type(ContextBinding));
    this._ctx.onDispose(
      query.subscribe(
        async () => {
          const bindings = this._reduce(query.results);

          // Resolve references.
          this._blueprints.value = this._resolve(bindings.blueprints, this._blueprints.peek());
          this._objects.value = this._resolve(bindings.objects, this._objects.peek());
          log('updated', {
            blueprints: this._blueprints.value.length,
            objects: this._objects.value.length,
          });
        },
        {
          fire: true,
        },
      ),
    );
  }

  protected override async _close(): Promise<void> {
    this._blueprints.value = [];
    this._objects.value = [];
  }

  async bind({ blueprints, objects }: BindingProps): Promise<void> {
    const { added: addedBlueprints, next: nextBlueprints } = this._processBindings(blueprints, this._blueprints.peek());
    const { added: addedObjects, next: nextObjects } = this._processBindings(objects, this._objects.peek());
    if (!addedBlueprints.length && !addedObjects.length) {
      return;
    }

    this._blueprints.value = nextBlueprints;
    this._objects.value = nextObjects;

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
  private _processBindings<T extends Obj.source>(
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
   * Resolve references to objects, falling back to existing objects if the reference target is missing.
   */
  private _resolve<T>(refs: Iterable<Ref.Ref<T>>, current: T[]): T[] {
    return [...refs]
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
>() {}
