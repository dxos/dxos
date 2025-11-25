//
// Copyright 2025 DXOS.org
//

import { type ReadonlySignal, computed } from '@preact/signals-core';
import * as Array from 'effect/Array';
import * as Context from 'effect/Context';
import * as Function from 'effect/Function';
import * as Schema from 'effect/Schema';

import { Blueprint } from '@dxos/blueprints';
import { Resource } from '@dxos/context';
import { DXN, type Entity, Filter, Obj, Query, type Ref, Type } from '@dxos/echo';
import { type Queue } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
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

  // TODO(burdon): Type.Expando => Type.Obj (or Obj.Any?)
  objects: Schema.Struct({
    added: Schema.Array(Type.Ref(Type.Expando)),
    removed: Schema.Array(Type.Ref(Type.Expando)),
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
  objects: Ref.Ref<Type.Expando>[];
}>;

export class Bindings {
  readonly blueprints = new ComplexSet<Ref.Ref<Blueprint.Blueprint>>((ref) => ref.dxn.toString());
  // TODO(burdon): Some DXNs have the Space prefix so only compare the object ID.
  readonly objects = new ComplexSet<Ref.Ref<Type.Expando>>((ref) => ref.dxn.asEchoDXN()?.echoId);

  toJSON() {
    return {
      blueprints: Array.fromIterable(this.blueprints).map((ref) => ref.dxn.toString()),
      objects: Array.fromIterable(this.objects).map((ref) => ref.dxn.toString()),
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
  // TODO(burdon): Cache value?
  private _bindings?: ReadonlySignal<Bindings>;
  private _blueprints?: ReadonlySignal<Ref.Ref<Blueprint.Blueprint>[]>;
  private _objects?: ReadonlySignal<Ref.Ref<Type.Expando>[]>;

  constructor(private readonly _queue: Queue) {
    super();
  }

  get bindings() {
    invariant(this._bindings, 'AiContextBinder not open');
    return this._bindings;
  }

  get blueprints() {
    invariant(this._blueprints, 'AiContextBinder not open');
    return this._blueprints;
  }

  get objects() {
    invariant(this._objects, 'AiContextBinder not open');
    return this._objects;
  }

  // TODO(wittjosiah): Use parent context?
  protected override async _open(): Promise<void> {
    const query = this._queue.query(Query.select(Filter.everything()));
    this._ctx.onDispose(query.subscribe(() => {}));
    this._bindings = computed(() => this._reduce(query.objects));
    this._blueprints = computed(() => [...this.bindings.value.blueprints]);
    this._objects = computed(() => [...this.bindings.value.objects]);
  }

  protected override async _close(): Promise<void> {
    this._bindings = undefined;
    this._blueprints = undefined;
    this._objects = undefined;
  }

  /**
   * Asynchronous query of all bindings.
   */
  async query(): Promise<Bindings> {
    const { objects } = await this._queue.query(Query.select(Filter.everything())).run();
    return this._reduce(objects);
  }

  // TODO(burdon): Pass in Blueprint obj (from registry?) and create reference.
  async bind(props: BindingProps): Promise<void> {
    const blueprints =
      props.blueprints?.filter((ref) => !this.blueprints.peek().find((b) => b.dxn.toString() === ref.dxn.toString())) ??
      [];
    const objects =
      props.objects?.filter((ref) => !this.objects.peek().find((o) => o.dxn.toString() === ref.dxn.toString())) ?? [];

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
  }

  async unbind(props: BindingProps): Promise<void> {
    if (!props.blueprints?.length && !props.objects?.length) {
      return;
    }

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

  private _reduce(items: Entity.Any[]): Bindings {
    return Function.pipe(
      items,
      Array.filter(Obj.instanceOf(ContextBinding)),
      Array.reduce(new Bindings(), (context, item) => {
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
