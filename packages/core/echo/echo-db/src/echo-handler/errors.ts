//
// Copyright 2025 DXOS.org
//

import { ApiError } from '@dxos/protocols';

/**
 * Error thrown when attempting to mutate an ECHO object outside of an Obj.change() context.
 */
export class MutationOutsideChangeContextError extends ApiError {
  constructor(operation: string, suggestion: string) {
    super({
      message: `Cannot ${operation} outside of Obj.change(). Use Obj.change(obj, (mutableObj) => { ${suggestion} }) instead.`,
    });
  }
}

/**
 * Create an error for attempting to set a property outside of a change context.
 */
export const createPropertySetError = (prop: string | symbol): MutationOutsideChangeContextError => {
  return new MutationOutsideChangeContextError(
    `modify ECHO object property "${String(prop)}"`,
    `mutableObj.${String(prop)} = value;`,
  );
};

/**
 * Create an error for attempting to delete a property outside of a change context.
 */
export const createPropertyDeleteError = (prop: string | symbol): MutationOutsideChangeContextError => {
  return new MutationOutsideChangeContextError(
    `delete ECHO object property "${String(prop)}"`,
    `delete mutableObj.${String(prop)};`,
  );
};

/**
 * Create an error for attempting to call an array method outside of a change context.
 */
export const createArrayMethodError = (method: string): MutationOutsideChangeContextError => {
  return new MutationOutsideChangeContextError(
    `call array.${method}() on ECHO object`,
    `mutableObj.array.${method}(...);`,
  );
};
