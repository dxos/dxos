//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { translations } from '#translations';
import { RegistryCapabilities } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'));
export const DevPluginLoader = Capability.lazyModule(
  'DevPluginLoader',
  { requires: [Capabilities.PluginManager, Capabilities.AtomRegistry, RegistryCapabilities.Settings], provides: [] },
  () => import('./dev-plugin-loader'),
);
export const Commands = AppCapability.commands(() => import('#commands'));
// `workerd` added (this plugin previously had no workerd-active modules at all): with the
// three-entry split gone, the canonical `plugin.tsx` always imports `#capabilities`, so if no
// module here carries a `workerd` annotation the generator never emits `gen/workerd.ts` and a
// workerd host's `#capabilities` condition falls through to `default` — this full browser barrel,
// React included. Flagging this as a judgment call: not preserving prior behavior (which was
// "nothing active"), but the minimal fix that keeps a workerd host safe; `node` is deliberately
// left off since `plugin.node.ts` never activated this module.
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  environments: ['workerd'],
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.dialog'],
});
export const RegistrySettings = AppCapability.settings(() => import('./settings'), {
  provides: [RegistryCapabilities.Settings],
});
export const Translations = AppCapability.translations(translations);
