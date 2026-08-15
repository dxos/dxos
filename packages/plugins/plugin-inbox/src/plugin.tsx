//
// Copyright 2024 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

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
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

// Canonical single-entry composition: lists every module once; per-environment filtering happens
// in the `#capabilities` barrel resolution — the generated headless barrels stub excluded modules
// as `undefined`, which `Plugin.addModule` skips.
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
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.make,
);

export default InboxPlugin;
