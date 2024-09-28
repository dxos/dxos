//
// Copyright 2024 DXOS.org
//

/**
 * NOTE: Async imports to decouple hyperformula deps.
 */
export const createGraphRegistry = async () => {
  const {
    ComputeGraphRegistry,
    CustomPlugin,
    CustomPluginTranslations,
    EdgeFunctionPlugin,
    EdgeFunctionPluginTranslations,
  } = await import('./graph');

  const registry = new ComputeGraphRegistry();
  await registry.initialize([
    { plugin: EdgeFunctionPlugin, translations: EdgeFunctionPluginTranslations },
    // TODO(wittjosiah): Remove. Needed for current test sheet generated data.
    { plugin: CustomPlugin, translations: CustomPluginTranslations },
  ]);

  return registry;
};
