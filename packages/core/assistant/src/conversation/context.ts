//
// Copyright 2025 DXOS.org
//

import { type ReadonlySignal, Signal, computed } from '@preact/signals-core';
import * as EArray from 'effect/Array';
import * as Context from 'effect/Context';
import * as Function from 'effect/Function';
import * as Schema from 'effect/Schema';

import { Blueprint } from '@dxos/blueprints';
import { Resource } from '@dxos/context';
import { DXN, type Database, type Entity, Obj, Query, type Ref, Type } from '@dxos/echo';
import { type Queue } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { isTruthy } from '@dxos/util';
import { ComplexSet } from '@dxos/util';

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
    added: Schema.Array(Type.Ref(Obj.Any)),
    removed: Schema.Array(Type.Ref(Obj.Any)),
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
  objects: Ref.Ref<Obj.Any>[];
}>;

export class Bindings {
  readonly blueprints = new ComplexSet<Ref.Ref<Blueprint.Blueprint>>((ref) => ref.dxn.toString());

  // TODO(burdon): Some DXNs have the Space prefix so only compare the object ID.
  readonly objects = new ComplexSet<Ref.Ref<Obj.Any>>((ref) => ref.dxn.asEchoDXN()?.echoId);

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
  /**
   * Reactive query of all bindings.
   */
  private _bindings?: ReadonlySignal<Bindings>;

  private _blueprints = new Signal<Blueprint.Blueprint[]>([]);
  private _objects = new Signal<Obj.Any[]>([]);

  constructor(
    private readonly _db: Database.Database,
    private readonly _queue: Queue,
  ) {
    super();
  }

  get bindings() {
    invariant(this._bindings, 'AiContextBinder not open');
    return this._bindings;
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
          this._bindings = computed(() => this._reduce(query.results));

          // Resolve references.
          this._blueprints.value = await Promise.all(
            [...this._bindings.value.blueprints]
              .map((ref) => {
                const dxn = ref.dxn.asEchoDXN();
                if (dxn) {
                  return this._db.getObjectById<Blueprint.Blueprint>(dxn.echoId);
                }
              })
              .filter(isTruthy),
          );

          // Resolve references.
          this._objects.value = await Promise.all(
            [...this._bindings.value.objects]
              .map((ref) => {
                const dxn = ref.dxn.asEchoDXN();
                if (dxn) {
                  return this._db.getObjectById<Obj.Any>(dxn.echoId);
                }
              })
              .filter(isTruthy),
          );

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
    this._bindings = undefined;
    this._blueprints.value = [];
    this._objects.value = [];
  }

  // TODO(burdon): Pass in Blueprint obj (from registry?) and create reference.
  async bind(props: BindingProps): Promise<void> {
    const blueprints =
      props.blueprints?.filter(
        (ref) => !this.blueprints.peek().find((blueprint) => Obj.getDXN(blueprint).toString() === ref.dxn.toString()),
      ) ?? [];

    const objects =
      props.objects?.filter(
        (ref) => !this.objects.peek().find((object) => Obj.getDXN(object).toString() === ref.dxn.toString()),
      ) ?? [];

    if (!blueprints.length && !objects.length) {
      return;
    }

    log('bind', { blueprints: blueprints.length, objects: objects.length });
    await this._queue.append([
      Obj.make(ContextBinding, {
        blueprints: {
          added: blueprints,
          removed: [],
        },
        objects: {
          added: objects,
          removed: [],
        },
      }),
    ]);
  }

  async unbind(props: BindingProps): Promise<void> {
    if (!props.blueprints?.length && !props.objects?.length) {
      return;
    }

    log('unbind', { blueprints: props.blueprints?.length, objects: props.objects?.length });
    await this._queue.append([
      Obj.make(ContextBinding, {
        blueprints: {
          added: [],
          removed: props.blueprints ?? [],
        },
        objects: {
          added: [],
          removed: props.objects ?? [],
        },
      }),
    ]);
  }

  /**
   * Reduce results into sets of blueprints and objects.
   */
  private _reduce(items: Entity.Unknown[]): Bindings {
    return Function.pipe(
      items,
      EArray.filter(Obj.instanceOf(ContextBinding)),
      EArray.reduce(new Bindings(), (context, item) => {
        item.blueprints.removed.forEach((ref) => context.blueprints.delete(ref));
        item.blueprints.added.forEach((ref) => context.blueprints.add(ref));
        item.objects.removed.forEach((ref) => {
          for (const obj of context.objects) {
            if (DXN.equalsEchoId(obj.dxn, ref.dxn)) {
              context.objects.delete(obj);
            }
          }
        });
        item.objects.added.forEach((ref) => context.objects.add(ref));
        return context;
      }),
    );
  }
}

export class AiContextService extends Context.Tag('@dxos/assistant/AiContextService')<
  AiContextService,
  {
    binder: AiContextBinder;
  }
>() {}
