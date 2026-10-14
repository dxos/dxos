//
// Copyright 2025 DXOS.org
//

import { BaseError } from '@dxos/errors';

/**
 * Error thrown when attempting to mutate an object outside of an Obj.update() context.
 */
export class MutationOutsideChangeContextError extends BaseError.extend(
  'MutationOutsideChangeContextError',
  'Cannot mutate object outside of Obj.update().',
) {
  constructor(operation: string, suggestion: string) {
    super({
      message: `Cannot ${operation} outside of Obj.update(). Use Obj.update(obj, (mutableObj) => { ${suggestion} }) instead.`,
    });
  }
}

/**
 * Create an error for attempting to set a property outside of a change context.
 */
export const createPropertySetError = (prop: string | symbol): MutationOutsideChangeContextError => {
  return new MutationOutsideChangeContextError(
    `modify object property "${String(prop)}"`,
    `mutableObj.${String(prop)} = value;`,
  );
};

/**
 * Create an error for attempting to delete a property outside of a change context.
 */
export const createPropertyDeleteError = (prop: string | symbol): MutationOutsideChangeContextError => {
  return new MutationOutsideChangeContextError(
    `delete object property "${String(prop)}"`,
    `delete mutableObj.${String(prop)};`,
  );
};

/**
 * Create an error for attempting to call an array method outside of a change context.
 */
export const createArrayMethodError = (method: string): MutationOutsideChangeContextError => {
  return new MutationOutsideChangeContextError(`call array.${method}()`, `mutableObj.array.${method}(...);`);
};

/**
 * Create an error for attempting a text CRDT mutation outside of a change context.
 */
export const createTextMethodError = (method: string): MutationOutsideChangeContextError => {
  return new MutationOutsideChangeContextError(`call Text.${method}()`, `Text.${method}(mutableObj, path, ...);`);
};
