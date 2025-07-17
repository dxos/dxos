//
// Copyright 2025 DXOS.org
//

import { computed } from '@preact/signals-core';
import { Array, pipe } from 'effect';

import { Obj, type Ref, type Relation } from '@dxos/echo';
import { type Queue } from '@dxos/echo-db';
import { ComplexSet } from '@dxos/util';

import { BlueprintBinding } from './binding';
import { type Blueprint } from './blueprint';

/**
 * Manages a set of blueprints that are bound to the conversation queue.
 */
export class BlueprintBinder {
  constructor(private readonly _queue: Queue) {}

  /**
   * Reactive query of all bound blueprints.
   */
  // TODO(burdon): Cache value?
  readonly bindings = computed(() => this._reduce(this._queue.objects));

  bind = async (blueprint: Ref.Ref<Blueprint>): Promise<void> => {
    await this._queue.append([
      Obj.make(BlueprintBinding, {
        added: [blueprint],
        removed: [],
      }),
    ]);
  };

  unbind = async (blueprint: Ref.Ref<Blueprint>): Promise<void> => {
    await this._queue.append([
      Obj.make(BlueprintBinding, {
        added: [],
        removed: [blueprint],
      }),
    ]);
  };

  /**
   * Asynchronous query of all bound blueprints.
   */
  query = async (): Promise<readonly Ref.Ref<Blueprint>[]> => {
    const queueItems = await this._queue.queryObjects();
    return this._reduce(queueItems);
  };

  private _reduce(items: (Obj.Any | Relation.Any)[]): readonly Ref.Ref<Blueprint>[] {
    return pipe(
      items,
      Array.filter(Obj.instanceOf(BlueprintBinding)),
      Array.reduce(new ComplexSet<Ref.Ref<Blueprint>>((ref) => ref.dxn.toString()), (bindings, item) => {
        item.removed.forEach((item) => bindings.delete(item));
        item.added.forEach((item) => bindings.add(item));
        return bindings;
      }),
      Array.fromIterable,
    );
  }
}
