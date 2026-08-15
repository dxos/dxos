//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AnchorResolver,
  AnchorSort,
  CommentConfig,
  CreateObject,
  MarkdownSettings,
  MarkdownState,
  OperationHandler,
  ReactSurface,
  Schema,
  SkillDefinition,
  Translations,
  UndoMappings,
} from '#capabilities';
import { meta } from '#meta';

// Canonical single-entry composition: lists every module once; per-environment filtering happens
// in the `#capabilities` barrel resolution — the generated headless barrels stub excluded modules
// as `undefined`, which `Plugin.addModule` skips.
export const MarkdownPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AnchorResolver),
  Plugin.addModule(AnchorSort),
  Plugin.addModule(CommentConfig),
  Plugin.addModule(CreateObject),
  Plugin.addModule(MarkdownSettings),
  Plugin.addModule(MarkdownState),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Schema),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(Translations),
  Plugin.addModule(UndoMappings),
  Plugin.make,
);

export default MarkdownPlugin;
