//
// Copyright 2024 DXOS.org
//

import { type FunctionContextOptions } from './async-function';
import { EdgeFunctionPlugin, EdgeFunctionPluginTranslations } from './edge-function';
import { ComputeGraphRegistry } from './graph';

/**
 * NOTE: Async imports to decouple hyperformula deps.
 */
export const createGraphRegistry = async (options: Partial<FunctionContextOptions>) => {
  const registry = new ComputeGraphRegistry(options);
  await registry.initialize([{ plugin: EdgeFunctionPlugin, translations: EdgeFunctionPluginTranslations }]);
  return registry;
};
