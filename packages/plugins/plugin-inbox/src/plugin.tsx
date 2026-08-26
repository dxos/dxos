//
// Copyright 2024 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  AutomationTemplates,
  ContactExtractor,
  CreateObject,
  IdentitySpecs,
  InboxSettings,
  MailboxProcessors,
  NavigationTargetResolver,
  OperationHandler,
  ReactSurface,
  Schema,
  SkillDefinition,
  SummarizeExtractor,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

export const InboxPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(AutomationTemplates),
  Plugin.addModule(ContactExtractor),
  Plugin.addModule(CreateObject),
  Plugin.addModule(IdentitySpecs),
  Plugin.addModule(InboxSettings),
  Plugin.addModule(MailboxProcessors),
  Plugin.addModule(NavigationTargetResolver),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Schema),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(SummarizeExtractor),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default InboxPlugin;
