//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import {
  CommentConfig,
  CreateObject,
  Migrations,
  OperationHandler,
  ReactSurface,
  SkillDefinition,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Drawing } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const IllustratorPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(Migrations),
  Plugin.addModule(CommentConfig),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.schema([Drawing.Drawing])),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(AppCapability.translations(translations)),
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

export default IllustratorPlugin;
