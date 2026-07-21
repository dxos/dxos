//
// Copyright 2024 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { Topic } from '@dxos/compute';
import { AccessToken, Cursor } from '@dxos/link';
import { TagIndex } from '@dxos/schema';
import { Event, Message } from '@dxos/types';

import {
  AppGraphBuilder,
  Connector,
  ContactExtractor,
  CreateObject,
  InboxSettings,
  NavigationResolver,
  OperationHandler,
  ReactSurface,
  SkillDefinition,
  SummarizeExtractor,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Calendar, ExtractedFrom, Mailbox } from '#types';

export const InboxPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(CreateObject),
  Plugin.addModule(NavigationResolver),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(
    AppCapability.schema([
      Event.Event,
      Mailbox.Mailbox,
      Calendar.Calendar,
      Message.Message,
      ExtractedFrom.ExtractedFrom,
      TagIndex.TagIndex,
      Topic.Topic,
      AccessToken.AccessToken,
      Cursor.Cursor,
    ]),
  ),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.addModule(InboxSettings),
  Plugin.addModule(Connector),
  Plugin.addModule(ContactExtractor),
  Plugin.addModule(SummarizeExtractor),
  Plugin.make,
);

export default InboxPlugin;
