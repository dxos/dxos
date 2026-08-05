//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import {
  AnchorSort,
  CommentConfig,
  ComputeGraphRegistry,
  CreateObject,
  Markdown,
  OperationHandler,
  ReactSurface,
  SheetState,
  SkillDefinition,
  UndoMappings,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Sheet } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const SheetPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(CommentConfig),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(UndoMappings),
  Plugin.addModule(AppCapability.schema([Sheet.Sheet])),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.addModule(SheetState),
  Plugin.addModule(ComputeGraphRegistry),
  Plugin.addModule(Markdown),
  Plugin.addModule(AnchorSort),
  Plugin.addModule(
    AppCapability.pluginAsset({
      pluginId: meta.profile.key,
      path: 'PLUGIN.mdl',
      content: pluginSpec,
      mimeType: 'application/x-mdl',
    }),
  ),
  Plugin.make,
);

export default SheetPlugin;
