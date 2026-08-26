//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as InboxCapabilities from '@dxos/plugin-inbox/InboxCapabilities';
import * as InboxEvents from '@dxos/plugin-inbox/InboxEvents';
import * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';
import * as ProjectsEvents from '@dxos/plugin-projects/ProjectsEvents';

import { meta } from '#meta';
import { translations } from '#translations';
import { BrainCapabilities } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
});
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
// No `export * from './fact-store'` here: that barrel re-export made the module a static import of
// the definition, which value-imports `FactStoreLive` from the `@dxos/pipeline-rdf` barrel and
// pulls SPARQL (~1.5 MB) into the definition closure — defeating this lazy module. Consumers of
// `FactStoreRegistry` / `makeFactStoreRegistry` import the module directly.
export const FactStore = AppCapability.layerSpec(() => import('./fact-store'), {
  name: 'FactStore',
  provides: [BrainCapabilities.FactStoreRegistry],
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.plugin.brain.surface.facts'],
});
export const Settings = AppCapability.settings(() => import('./settings'), {
  activatesOn: ActivationEvents.Idle,
  provides: [BrainCapabilities.Settings],
});
export const MailboxProcessor = Capability.lazyModule(
  'MailboxProcessor',
  {
    requires: [Capabilities.AtomRegistry],
    provides: [InboxCapabilities.MailboxProcessor],
    activatesOn: InboxEvents.Start,
  },
  () => import('./mailbox-processor'),
);
export const ReplyGenerator = Capability.lazyModule(
  'ReplyGenerator',
  { provides: [InboxCapabilities.ReplyGenerator], activatesOn: InboxEvents.Start },
  () => import('./reply-generator'),
);
export const ProjectTemplates = Capability.lazyModule(
  'ProjectTemplates',
  { provides: [ProjectCapabilities.Template], activatesOn: ProjectsEvents.Start },
  () => import('./project-templates'),
);
export const Translations = AppCapability.translations(translations);
