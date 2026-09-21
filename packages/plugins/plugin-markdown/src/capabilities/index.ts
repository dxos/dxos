//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { translations as editorTranslations } from '@dxos/react-ui-editor/translations';

import { translations } from '#translations';

// Ordering-only: registers the anchor text resolver once the app graph exists (mirrors the
// AppGraphReady ordering the event-mode module used previously); the body reads nothing.
export { AnchorResolver } from './anchor-resolver.ts';
// Ordering-only: registers the sort comparator once the app graph exists (mirrors the
// AppGraphReady ordering the event-mode module used previously); the body reads nothing.
export { AnchorSort } from './anchor-sort.ts';
export { CommentConfig } from './comment-config.ts';
export { CreateObject } from './create-object.ts';
export { Schema } from './schema.ts';
export { SkillDefinition } from './skill-definition.ts';
export { OperationHandler } from './operation-handler.ts';
export { ReactSurface } from './react-surface.ts';
export { MarkdownSettings } from './settings.ts';
// Browser-only, like the two anchor modules: it requires attention's view state, which only the
// app shell provides — activating it headlessly just fails the dependency graph at boot.
export { MarkdownState } from './state.ts';
export const Translations = AppCapability.translations([...translations, ...editorTranslations]);
export { MarkdownTour as Tour } from './tour.ts';
export { UndoMappings } from './undo-mappings.ts';
