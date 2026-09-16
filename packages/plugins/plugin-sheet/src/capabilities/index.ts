//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import * as MarkdownEvents from '@dxos/plugin-markdown/MarkdownEvents';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import { meta } from '#meta';
import { translations } from '#translations';
import { SheetCapabilities, SheetEvents } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

// Ordering-only: registers the sort comparator once the app graph exists; the body reads
// nothing else.
export const AnchorSort = AppCapability.anchorSort(() => import('./anchor-sort.ts'), {
  requires: [AppCapabilities.AppGraph],
  activatesOn: SheetEvents.Start,
});
export const CommentConfig = AppCapability.commentConfig(() => import('./comment-config.ts'), {
  activatesOn: SheetEvents.Start,
  environments: ['node'],
});
export const ComputeGraphRegistry = Capability.lazyModule(
  'ComputeGraphRegistry',
  {
    // Headless: formulas evaluate in a markdown document with no sheet surface ever rendered, so
    // gating this on the sheet's own start conflates "the sheet UI is on screen" with "compute
    // graphs exist". Ungated (hence idle) it also becomes pullable by the consumers that need it
    // earlier, which a start-gated provider is not.
    requires: [ClientCapabilities.Client, Capabilities.ProcessManagerRuntime],
    provides: [SheetCapabilities.ComputeGraphRegistry],
  },
  () => import('./compute-graph-registry.ts'),
);
export const CreateObject = SpaceCapability.createObject(() => import('./create-object.ts'), {
  environments: ['node'],
});
export const Markdown = Capability.lazyModule(
  'MarkdownExtension',
  {
    // The provider callbacks read the registry, so it must be in place when this activates.
    requires: [SheetCapabilities.ComputeGraphRegistry],
    provides: [MarkdownCapabilities.ExtensionProvider],
    activatesOn: MarkdownEvents.Start,
  },
  () => import('./markdown-extension.ts'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'), {
  activatesOn: ActivationEvents.Idle,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface.ts'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.objectProperties', 'org.dxos.role.section'],
});
export const Schema = AppCapability.schema(() => import('./schema.ts'));
export const SheetState = Capability.lazyModule(
  'SheetState',
  { provides: [SheetCapabilities.GridInstances], activatesOn: SheetEvents.Start },
  () => import('./state.ts'),
);
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition.ts'), {
  environments: ['node'],
});
export const UndoMappings = AppCapability.undoMappings(() => import('./undo-mappings.ts'), {
  activatesOn: SheetEvents.Start,
  environments: ['node'],
});
export const Translations = AppCapability.translations(translations);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
