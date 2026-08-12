//
// Copyright 2024 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { Message } from '@dxos/types';

import {
  AppGraphBuilder,
  AutomationTemplates,
  ContactExtractor,
  CreateObject,
  IdentitySpecs,
  InboxSettings,
  NavigationTargetResolver,
  OperationHandler,
  ReactSurface,
  SkillDefinition,
  SummarizeExtractor,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const InboxPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(CreateObject),
  Plugin.addModule(NavigationTargetResolver),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.schema(() => import('./schema'))),
  Plugin.addModule(IdentitySpecs),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.addModule(InboxSettings),
  Plugin.addModule(AutomationTemplates),
  Plugin.addModule(ContactExtractor),
  Plugin.addModule(SummarizeExtractor),
  Plugin.make,
);

export default InboxPlugin;
