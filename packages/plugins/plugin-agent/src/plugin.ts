//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AgentMailbox,
  AppGraphBuilder,
  Brain,
  CreateObject,
  InviteeSource,
  EmailChannelBackend,
  OperationHandler,
  ReactSurface,
  Schema,
  SkillDefinition,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

export const AgentPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(Schema),
  Plugin.addModule(Brain),
  Plugin.addModule(CreateObject),
  Plugin.addModule(InviteeSource),
  Plugin.addModule(AgentMailbox),
  Plugin.addModule(EmailChannelBackend),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default AgentPlugin;
