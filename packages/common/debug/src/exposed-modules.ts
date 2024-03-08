//
// Copyright 2024 DXOS.org
//

/**
 * Allows to register a module to be used later during debugging.
 *
 * ```ts
 * import * as keys from '@dxos/keys';
 * exposeModule('@dxos/keys', keys);
 *
 * ...
 *
 * const { PublicKey } = importModule('@dxos/keys');
 * ```
 *
 * Overwrites the module if it already exists.
 */
export const exposeModule = (name: string, module: any) => {
  EXPOSED_MODULES[name] = module;
};

/**
 * Imports a previously exposed module by its name.
 * Throws an error if the module is not found.
 *
 * @param {string} name - The name of the module to import.
 * @returns {any} The imported module.
 * @throws {Error} If the module is not exposed.
 */
export const importModule = (name: string) => {
  if (EXPOSED_MODULES[name]) {
    return EXPOSED_MODULES[name];
  } else {
    throw new Error(`Module ${name} is not exposed.`);
  }
};

const EXPOSED_MODULES: Record<string, any> = {};
