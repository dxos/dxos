//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';
import { translations } from '#translations';
import { BrainCapabilities } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export { OperationHandler } from './operation-handler.ts';
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
export { SkillDefinition } from './skill-definition.ts';
// No `export * from './fact-store.ts'` here: that barrel re-export made the module a static import of
// the definition, which value-imports `FactStoreLive` from the `@dxos/pipeline-rdf` barrel and
// pulls SPARQL (~1.5 MB) into the definition closure — defeating this lazy module. Consumers of
// `FactStoreRegistry` / `makeFactStoreRegistry` import the module directly.
export const FactStore = AppCapability.lazyLayerSpec(() => import('./fact-store.ts'), {
  name: 'FactStore',
  provides: [BrainCapabilities.FactStoreRegistry],
});
export { ReactSurface } from './react-surface.ts';
export { Settings } from './settings.ts';
export { MailboxProcessor } from './mailbox-processor.ts';
export { ReplyGenerator } from './reply-generator.ts';
export { ProjectTemplates } from './project-templates.ts';
export const Translations = AppCapability.translations(translations);
