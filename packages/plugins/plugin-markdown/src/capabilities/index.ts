//
// Copyright 2025 DXOS.org
//

import { ActivationEvent, ActivationEvents, Capability } from '@dxos/app-framework';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { SpaceCapability } from '@dxos/plugin-space';

import { MarkdownCapabilities } from '#types';

// Ordering-only: registers the anchor text resolver once the app graph exists (mirrors the
// AppGraphReady ordering the event-mode module used previously); the body reads nothing.
export const AnchorResolver = Capability.lazyModule(
  'AnchorResolver',
  { requires: [AppCapabilities.AppGraph], provides: [AppCapabilities.AnchorResolver] },
  () => import('./anchor-resolver'),
);
// Ordering-only: registers the sort comparator once the app graph exists (mirrors the
// AppGraphReady ordering the event-mode module used previously); the body reads nothing.
export const AnchorSort = AppCapability.anchorSort(() => import('./anchor-sort'), {
  requires: [AppCapabilities.AppGraph],
});
export const CommentConfig = AppCapability.commentConfig(() => import('./comment-config'));
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
// Also gated on the foreign namespace's demand event: collaboration operations are defined in app-toolkit,
// so the handler-set resolver's targeted pull reaches this module without a fallback flood.
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvent.oneOf(
    ActivationEvents.OwnOperationHandlersRequested,
    ActivationEvents.OperationHandlersRequested('org.dxos.app-framework.collaboration'),
  ),
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.cardContent', 'org.dxos.role.section', 'org.dxos.role.tabpanel'],
});
export const MarkdownSettings = AppCapability.settings(() => import('./settings'), {
  provides: [MarkdownCapabilities.Settings],
});
export const MarkdownState = Capability.lazyModule(
  'MarkdownState',
  {
    requires: [AttentionCapabilities.ViewState],
    provides: [MarkdownCapabilities.EditorState, MarkdownCapabilities.EditorViews],
  },
  () => import('./state'),
);
export const UndoMappings = AppCapability.undoMappings(() => import('./undo-mappings'));
