//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { translations as editorTranslations } from '@dxos/react-ui-editor/translations';

import { translations } from '#translations';

export { AnchorResolver } from './anchor-resolver.ts';
export { AnchorSort } from './anchor-sort.ts';
export { CommentConfig } from './comment-config.ts';
export { CreateObject } from './create-object.ts';
export { Schema } from './schema.ts';
export { SkillDefinition } from './skill-definition.ts';
export { OperationHandler } from './operation-handler.ts';
export { ReactSurface } from './react-surface.ts';
export { MarkdownSettings } from './settings.ts';
export { MarkdownState } from './state.ts';
export const Translations = AppCapability.translations([...translations, ...editorTranslations]);
export { MarkdownTour as Tour } from './tour.ts';
export { UndoMappings } from './undo-mappings.ts';
