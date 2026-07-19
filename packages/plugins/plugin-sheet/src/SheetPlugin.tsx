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
  Plugin.addLazyModule(SkillDefinition),
  Plugin.addLazyModule(CommentConfig),
  Plugin.addLazyModule(CreateObject),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(UndoMappings),
  Plugin.addLazyModule(AppCapability.schema([Sheet.Sheet])),
  Plugin.addLazyModule(ReactSurface),
  Plugin.addLazyModule(AppCapability.translations(translations)),
  Plugin.addLazyModule(SheetState),
  Plugin.addLazyModule(ComputeGraphRegistry),
  Plugin.addLazyModule(Markdown),
  Plugin.addLazyModule(AnchorSort),
  Plugin.addLazyModule(
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
