//
// Copyright 2024 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { Topic } from '@dxos/pipeline-email';
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
  Plugin.addLazyModule(AppGraphBuilder),
  Plugin.addLazyModule(SkillDefinition),
  Plugin.addLazyModule(CreateObject),
  Plugin.addLazyModule(NavigationResolver),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(
    AppCapability.schema([
      Event.Event,
      Mailbox.Mailbox,
      Calendar.Calendar,
      Message.Message,
      ExtractedFrom.ExtractedFrom,
      TagIndex.TagIndex,
      Topic,
    ]),
  ),
  Plugin.addLazyModule(ReactSurface),
  Plugin.addLazyModule(AppCapability.translations(translations)),
  Plugin.addLazyModule(InboxSettings),
  Plugin.addLazyModule(Connector),
  Plugin.addLazyModule(ContactExtractor),
  Plugin.addLazyModule(SummarizeExtractor),
  Plugin.make,
);

export default InboxPlugin;
