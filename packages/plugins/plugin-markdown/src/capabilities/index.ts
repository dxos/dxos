//
// Copyright 2025 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { translations as editorTranslations } from '@dxos/react-ui-editor/translations';

import { translations } from '#translations';
import { MarkdownCapabilities } from '#types';

// Ordering-only: registers the anchor text resolver once the app graph exists (mirrors the
// AppGraphReady ordering the event-mode module used previously); the body reads nothing.
export const AnchorResolver = Capability.lazyModule(
  'AnchorResolver',
  { requires: [AppCapabilities.AppGraph], provides: [AppCapabilities.AnchorResolver], environments: [] },
  () => import('./anchor-resolver.ts'),
);
// Ordering-only: registers the sort comparator once the app graph exists (mirrors the
// AppGraphReady ordering the event-mode module used previously); the body reads nothing.
export const AnchorSort = AppCapability.anchorSort(() => import('./anchor-sort.ts'), {
  requires: [AppCapabilities.AppGraph],
});
export const CommentConfig = AppCapability.commentConfig(() => import('./comment-config.ts'));
export const CreateObject = SpaceCapability.createObject(() => import('./create-object.ts'), {
  environments: ['node'],
});
export const Schema = AppCapability.schema(() => import('./schema.ts'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition.ts'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface.ts'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.cardContent', 'org.dxos.role.section', 'org.dxos.role.tabpanel'],
});
export const MarkdownSettings = AppCapability.settings(() => import('./settings.ts'), {
  provides: [MarkdownCapabilities.Settings],
});
// Browser-only, like the two anchor modules: it requires attention's view state, which only the
// app shell provides — activating it headlessly just fails the dependency graph at boot.
export const MarkdownState = Capability.lazyModule(
  'MarkdownState',
  {
    requires: [AttentionCapabilities.ViewState],
    provides: [MarkdownCapabilities.EditorState, MarkdownCapabilities.EditorViews],
    environments: [],
  },
  () => import('./state.ts'),
);
export const Translations = AppCapability.translations([...translations, ...editorTranslations]);
export const UndoMappings = AppCapability.undoMappings(() => import('./undo-mappings.ts'));
