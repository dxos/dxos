//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
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
  // Compiler-forced: without the explicit type argument here, inference for the plain
  // `Plugin.addModule` extractor entries below resolves `T` to `unknown` instead of `void`.
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
