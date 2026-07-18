//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Topic } from '@dxos/pipeline-email';
import { TagIndex } from '@dxos/schema';
import { Event, Message } from '@dxos/types';

import {
  AppGraphBuilder,
  Connector,
  CreateObject,
  InboxSettings,
  NavigationResolver,
  OperationHandler,
  ReactSurface,
  SkillDefinition,
} from '#capabilities';
import { meta } from '#meta';
import { ContactMessageExtractor, SummarizeMessageExtractor } from '#operations';
import { translations } from '#translations';
import { Calendar, ExtractedFrom, InboxCapabilities, Mailbox } from '#types';

export const InboxPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule<void>({
    requires: AppGraphBuilder.requires,
    provides: AppGraphBuilder.provides,
    activate: AppGraphBuilder,
  }),
  AppPlugin.addSkillDefinitionModule<void>({
    requires: SkillDefinition.requires,
    provides: SkillDefinition.provides,
    activate: SkillDefinition,
  }),
  AppPlugin.addCreateObjectModule<void>({
    requires: CreateObject.requires,
    provides: CreateObject.provides,
    activate: CreateObject,
  }),
  AppPlugin.addNavigationResolverModule<void>({
    requires: NavigationResolver.requires,
    provides: NavigationResolver.provides,
    activate: NavigationResolver,
  }),
  AppPlugin.addOperationHandlerModule<void>({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  AppPlugin.addSchemaModule<void>({
    schema: [
      Event.Event,
      Mailbox.Mailbox,
      Calendar.Calendar,
      Message.Message,
      ExtractedFrom.ExtractedFrom,
      TagIndex.TagIndex,
      Topic,
    ],
  }),
  AppPlugin.addSurfaceModule<void>({
    requires: ReactSurface.requires,
    provides: ReactSurface.provides,
    activate: ReactSurface,
  }),
  AppPlugin.addTranslationsModule<void>({ translations }),
  Plugin.addLazyModule(InboxSettings),
  Plugin.addLazyModule<void>(Connector),
  Plugin.addModule({
    id: 'contact-extractor',
    requires: [],
    provides: [InboxCapabilities.ObjectExtractor],
    activate: () => Effect.succeed([Capability.provide(InboxCapabilities.ObjectExtractor, ContactMessageExtractor)]),
  }),
  Plugin.addModule({
    id: 'summarize-extractor',
    requires: [],
    provides: [InboxCapabilities.ObjectExtractor],
    activate: () => Effect.succeed([Capability.provide(InboxCapabilities.ObjectExtractor, SummarizeMessageExtractor)]),
  }),
  Plugin.make,
);

export default InboxPlugin;
