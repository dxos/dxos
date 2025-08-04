//
// Copyright 2025 DXOS.org
//

import { type ReadonlySignal, computed } from '@preact/signals-core';
import { Schema } from 'effect';
import { Array, pipe } from 'effect';

import { Blueprint } from '@dxos/blueprints';
import { Obj, type Ref, type Relation, Type } from '@dxos/echo';
import { type Queue } from '@dxos/echo-db';
import { ComplexSet } from '@dxos/util';

/**
 * Thread message that binds or unbinds contextual objects to a conversation.
 */
// TODO(burdon): Move to @dxos/schema ContentBlock.
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
  readonly objects = new ComplexSet<Ref.Ref<Type.Expando>>((ref) => ref.dxn.toString());

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
export class AiContextBinder {
  constructor(private readonly _queue: Queue) {}

  /**
   * Reactive query of all bindings.
   */
  // TODO(burdon): Cache value?
  readonly bindings: ReadonlySignal<Bindings> = computed(() => this._reduce(this._queue.objects));

  readonly blueprints: ReadonlySignal<Ref.Ref<Blueprint.Blueprint>[]> = computed(() => [
    ...this.bindings.value.blueprints,
  ]);

  readonly objects: ReadonlySignal<Ref.Ref<Type.Expando>[]> = computed(() => [...this.bindings.value.objects]);

  /**
   * Asynchronous query of all bindings.
   */
  async query(): Promise<Bindings> {
    const queueItems = await this._queue.queryObjects();
    return this._reduce(queueItems);
  }

  // TODO(burdon): Pass in Blueprint obj (from registry?) and create reference.
  async bind(props: BindingProps): Promise<void> {
    if (!props.blueprints?.length && !props.objects?.length) {
      return;
    }

    await this._queue.append([
      Obj.make(ContextBinding, {
        blueprints: {
          added: props.blueprints ?? [],
          removed: [],
        },
        objects: {
          added: props.objects ?? [],
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

  private _reduce(items: (Obj.Any | Relation.Any)[]): Bindings {
    return pipe(
      items,
      Array.filter(Obj.instanceOf(ContextBinding)),
      Array.reduce(new Bindings(), (context, item) => {
        item.blueprints.removed.forEach((item) => context.blueprints.delete(item));
        item.blueprints.added.forEach((item) => context.blueprints.add(item));
        item.objects.removed.forEach((item) => context.objects.delete(item));
        item.objects.added.forEach((item) => context.objects.add(item));
        return context;
      }),
    );
  }
}
