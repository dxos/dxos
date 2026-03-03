//
// Copyright 2025 DXOS.org
//

/**
 * Error thrown when attempting to mutate an object outside of an Obj.change() context.
 */
export class MutationOutsideChangeContextError extends Error {
  constructor(operation: string, suggestion: string) {
    super(
      `Cannot ${operation} outside of Obj.change(). Use Obj.change(obj, (mutableObj) => { ${suggestion} }) instead.`,
    );
    this.name = 'MutationOutsideChangeContextError';
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
