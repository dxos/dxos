//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  ChannelBackend,
  Connector,
  DiscordBot,
  OperationHandler,
  PluginAsset,
  ReactSurface,
  Schema,
  SkillDefinition,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

export const DiscordPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(ChannelBackend),
  Plugin.addModule(Connector),
  Plugin.addModule(DiscordBot),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Schema),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default DiscordPlugin;
