//
// Copyright 2023 DXOS.org
//

import { defaultMap } from './map';

const symbol = Symbol.for('dxos.instance-contexts');

const instanceContexts = ((globalThis as any)[symbol] ??= new WeakMap<
  any,
  {
    nextId: number;
    instanceIds: WeakMap<any, number>;
  }
>());

/**
 * Returns a unique instance id for a given object.
 * Ids are generated as incrementing numbers.
 * Ids are only unique within the scope of a given prototype.
 * Instances of different classes may have the same id.
 */
export const getPrototypeSpecificInstanceId = (instance: any): number => {
  const prototype = Object.getPrototypeOf(instance);
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

  const prototype = Object.getPrototypeOf(instance);
  return `${prototype.constructor.name}#${getPrototypeSpecificInstanceId(instance)}`;
};
