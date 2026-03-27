//
// Copyright 2025 DXOS.org
//

import * as Layer from 'effect/Layer';

import { GenericToolkit } from '@dxos/ai';
import { Chat, WebSearchToolkit } from '@dxos/assistant-toolkit';
import { DatabaseBlueprint, DatabaseHandlers } from '@dxos/assistant-toolkit';
import { Blueprint } from '@dxos/blueprints';
import { OperationHandlerSet } from '@dxos/operation';
import { Feed, Tag, type Type } from '@dxos/echo';
import { AssistantBlueprint } from '@dxos/plugin-assistant/blueprints';
import { ChessBlueprint } from '@dxos/plugin-chess/blueprints';
import { ChessHandlers } from '@dxos/plugin-chess/operations';
import { Chess } from '@dxos/plugin-chess/types';
import { CalendarBlueprint, InboxBlueprint, InboxSendBlueprint } from '@dxos/plugin-inbox/blueprints';
import { InboxOperationHandlerSet } from '@dxos/plugin-inbox/operations';
import { Calendar, Mailbox } from '@dxos/plugin-inbox/types';
import { KanbanBlueprint } from '@dxos/plugin-kanban/blueprints';
import { KanbanOperationHandlerSet } from '@dxos/plugin-kanban/operations';
import { MapBlueprint } from '@dxos/plugin-map/blueprints';
import { MapOperationHandlerSet } from '@dxos/plugin-map/operations';
import { MarkdownBlueprint } from '@dxos/plugin-markdown/blueprints';
import { MarkdownOperationHandlerSet } from '@dxos/plugin-markdown/operations';
import { Markdown } from '@dxos/plugin-markdown/types';
import { ScriptBlueprint } from '@dxos/plugin-script/blueprints';
import { ScriptOperationHandlerSet } from '@dxos/plugin-script/operations';
import { TableBlueprint } from '@dxos/plugin-table/blueprints';
import { TableOperationHandlerSet } from '@dxos/plugin-table/operations';
import { ThreadBlueprint } from '@dxos/plugin-thread/blueprints';
import { ThreadOperationHandlerSet } from '@dxos/plugin-thread/operations';
import { TranscriptionBlueprint } from '@dxos/plugin-transcription/blueprints';
import { TranscriptionOperationHandlerSet } from '@dxos/plugin-transcription/operations';
import { DataTypes } from '@dxos/schema';
import {
  AnchoredTo,
  Employer,
  Event,
  HasConnection,
  HasRelationship,
  HasSubject,
  Organization,
  Person,
  Pipeline,
  Task,
} from '@dxos/types';

import * as TestToolkit from './test-toolkit';

export const blueprintRegistry = new Blueprint.Registry([
  // Blueprints available to the chat.
  AssistantBlueprint.make(),
  DatabaseBlueprint.make(),
  CalendarBlueprint.make(),
  ChessBlueprint.make(),
  InboxBlueprint.make(),
  InboxSendBlueprint.make(),
  KanbanBlueprint.make(),
  MapBlueprint.make(),
  MarkdownBlueprint.make(),
  ScriptBlueprint.make(),
  TableBlueprint.make(),
  ThreadBlueprint.make(),
  TranscriptionBlueprint.make(),
]);

// TODO(dmaretskyi): In Composer, those are handled by the plugins and capabilities mechanism.
//  But since CLI doesn't have this, we have to manually collect them and configure them here.
//  Providing functions and toolkits are essential to the blueprint operation,
//  since blueprints referencing tools and functions that are not included here will produce a "tool not found" error.

export const operationHandlers = OperationHandlerSet.merge(
  // NOTE: Operation handlers referenced by blueprints above need to be added here.
  DatabaseHandlers,
  ChessHandlers,
  InboxOperationHandlerSet,
  KanbanOperationHandlerSet,
  MapOperationHandlerSet,
  MarkdownOperationHandlerSet,
  ScriptOperationHandlerSet,
  TableOperationHandlerSet,
  ThreadOperationHandlerSet,
  TranscriptionOperationHandlerSet,
);

export const toolkits: GenericToolkit.GenericToolkit[] = [
  // NOTE: Toolkits referenced by blueprints above need to be added here.
  GenericToolkit.make(WebSearchToolkit, Layer.empty),

  // TODO(burdon): Remove?
  GenericToolkit.make(TestToolkit.toolkit, TestToolkit.layer),
];

export const types: Type.AnyEntity[] = [
  // NOTE: Types referenced by blueprints above need to be added here.
  DataTypes,
  [Chat.Chat],
  [Chess.Game],
  [Markdown.Document],
  [Mailbox.Mailbox, Calendar.Calendar, Feed.Feed],
  [Blueprint.Blueprint],
  [Tag.Tag],
  [Event.Event, Organization.Organization, Person.Person, Pipeline.Pipeline, Task.Task],
  [
    AnchoredTo.AnchoredTo,
    Employer.Employer,
    HasConnection.HasConnection,
    HasRelationship.HasRelationship,
    HasSubject.HasSubject,
  ],
].flat();
