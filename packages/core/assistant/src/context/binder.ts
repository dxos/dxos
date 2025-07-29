//
// Copyright 2025 DXOS.org
//

import { computed, type ReadonlySignal } from '@preact/signals-core';
import { Array, pipe } from 'effect';

import { type Blueprint } from '@dxos/blueprints';
import { Obj, type Type, type Ref, type Relation } from '@dxos/echo';
import { type Queue } from '@dxos/echo-db';
import { ComplexSet } from '@dxos/util';

import { ContextBinding } from './binding';

/**
 * Manages bindings of blueprints and objects to a conversation.
 */
export class ContextBinder {
  constructor(private readonly _queue: Queue) {}

  /**
   * Reactive query of all bindings.
   */
  // TODO(burdon): Cache value?
  readonly bindings: ReadonlySignal<Bindings> = computed(() => this._reduce(this._queue.objects));

  // TODO(burdon): load refs?
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

export type BindingProps = Partial<{
  blueprints: Ref.Ref<Blueprint.Blueprint>[];
  objects: Ref.Ref<Type.Expando>[];
}>;

export class Bindings {
  blueprints = new ComplexSet<Ref.Ref<Blueprint.Blueprint>>((ref) => ref.dxn.toString());
  objects = new ComplexSet<Ref.Ref<Type.Expando>>((ref) => ref.dxn.toString());
}
