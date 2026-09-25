//
// Copyright 2023 DXOS.org
//

import { defaultMap } from './map.ts';

const symbol = Symbol.for('dxos.instance-contexts');
const nullPrototypeSymbol = Symbol.for('dxos.null-prototype');

type InstanceContexts = WeakMap<
  any,
  {
    nextId: number;
    instanceIds: WeakMap<any, number>;
  }
>;

/** Typed view onto `globalThis`, narrow enough to key by our symbols without `any`. */
const globals = globalThis as Record<symbol, unknown>;

const instanceContexts = (globals[symbol] ??= new WeakMap()) as InstanceContexts;

/** Map key for a null-prototype instance, shared through `globalThis` like the contexts it keys. */
const NULL_PROTOTYPE = (globals[nullPrototypeSymbol] ??= Object.freeze({}));

/**
 * Returns a unique instance id for a given object.
 * Ids are generated as incrementing numbers.
 * Ids are only unique within the scope of a given prototype.
 * Instances of different classes may have the same id.
 */

export const getPrototypeSpecificInstanceId = (instance: any): number => {
  const prototype = Object.getPrototypeOf(instance) ?? NULL_PROTOTYPE;
  const instanceCtx = defaultMap(instanceContexts as any, prototype, () => ({
    nextId: 0,
    instanceIds: new WeakMap(),
  }));

  let id = instanceCtx.instanceIds.get(instance);
  if (id === undefined) {
    id = instanceCtx.nextId++;
    instanceCtx.instanceIds.set(instance, id);
  }

  return id;
};

export const getDebugName = (instance: any): string => {
  if (instance == null) {
    return 'null';
  }

  // A module namespace object has no prototype, which is what a module-scope `log.*` call is
  // attributed to.
  const name = Object.getPrototypeOf(instance)?.constructor?.name ?? 'Module';
  return `${name}#${getPrototypeSpecificInstanceId(instance)}`;
};
