//
// Copyright 2024 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as Project from '@dxos/compute/Project';
import { AccessToken, Cursor } from '@dxos/link';
import { TagIndex } from '@dxos/schema';
import { Event, Message } from '@dxos/types';

import {
  AppGraphBuilder,
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

import * as Calendar from './types/Calendar';
import * as ExtractedFrom from './types/ExtractedFrom';
import * as Mailbox from './types/Mailbox';

export const InboxPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(CreateObject),
  Plugin.addModule(NavigationTargetResolver),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(
    AppCapability.schema([
      Event.Event,
      Mailbox.Mailbox,
      Calendar.Calendar,
      Message.Message,
      ExtractedFrom.ExtractedFrom,
      TagIndex.TagIndex,
      Project.Project,
      AccessToken.AccessToken,
      Cursor.Cursor,
    ]),
  ),
  Plugin.addModule(IdentitySpecs),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.addModule(InboxSettings),
  Plugin.addModule(ContactExtractor),
  Plugin.addModule(SummarizeExtractor),
  Plugin.make,
);

export default InboxPlugin;
