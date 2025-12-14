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
  private readonly _blueprints = new Signal<Blueprint.Blueprint[]>([]);
  private readonly _objects = new Signal<Obj.Any[]>([]);

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
          this._blueprints.value = [...bindings.blueprints].map((ref) => ref.target).filter(isTruthy);
          this._objects.value = [...bindings.objects].map((ref) => ref.target).filter(isTruthy);

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

    log('bind', {
      blueprints: blueprints.length,
      objects: objects.length,
    });

    // TODO(burdon): Reduce.
    this._blueprints.value = [...this._blueprints.value, ...blueprints.map((blueprint) => blueprint.target!)];
    this._objects.value = [...this._objects.value, ...objects.map((object) => object.target!)];
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
}

export class AiContextService extends Context.Tag('@dxos/assistant/AiContextService')<
  AiContextService,
  {
    binder: AiContextBinder;
  }
>() {}
