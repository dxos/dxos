//
// Copyright 2024 DXOS.org
//

import { CustomPlugin, CustomPluginTranslations } from './custom-function';
import { EdgeFunctionPlugin, EdgeFunctionPluginTranslations } from './edge-function';
import { ComputeGraphRegistry } from './graph';

/**
 * NOTE: Async imports to decouple hyperformula deps.
 */
export const createGraphRegistry = async () => {
  const registry = new ComputeGraphRegistry();
  await registry.initialize([
    { plugin: EdgeFunctionPlugin, translations: EdgeFunctionPluginTranslations },
    // TODO(wittjosiah): Remove. Needed for current test sheet generated data.
    { plugin: CustomPlugin, translations: CustomPluginTranslations },
  ]);

  return registry;
};
