//
// Copyright 2025 DXOS.org
//

import * as Layer from 'effect/Layer';

import { OpaqueToolkit } from '@dxos/ai';
import { Chat, WebSearchToolkit } from '@dxos/assistant-toolkit';
import { DatabaseBlueprint, DatabaseHandlers } from '@dxos/assistant-toolkit';
import { Blueprint, OperationHandlerSet } from '@dxos/compute';
import { Feed, Tag, type Type } from '@dxos/echo';
import { AssistantBlueprint } from '@dxos/plugin-assistant';
import { Chess, ChessBlueprint } from '@dxos/plugin-chess';
import { ChessOperationHandlerSet } from '@dxos/plugin-chess/plugin';
import { Game } from '@dxos/plugin-game';
// Narrow subpath imports so the CLI's `bun run --conditions=source` doesn't pull
// `@dxos/plugin-inbox`'s React-component sources (which transitively import
// `react-aria-components` — a package whose `source` export condition advertises
// a TS file that isn't shipped in its dist, causing Bun resolution to fail).
import { CalendarBlueprint, InboxBlueprint, InboxSendBlueprint } from '@dxos/plugin-inbox/blueprints';
import { InboxOperationHandlerSet } from '@dxos/plugin-inbox/plugin';
import { Calendar, Mailbox } from '@dxos/plugin-inbox/types';
import { KanbanBlueprint } from '@dxos/plugin-kanban';
import { KanbanOperationHandlerSet } from '@dxos/plugin-kanban/plugin';
import { MapBlueprint } from '@dxos/plugin-map';
import { MapOperationHandlerSet } from '@dxos/plugin-map/plugin';
import { Markdown, MarkdownBlueprint } from '@dxos/plugin-markdown';
import { MarkdownOperationHandlerSet } from '@dxos/plugin-markdown/plugin';
import { ScriptBlueprint } from '@dxos/plugin-script';
import { ScriptOperationHandlerSet } from '@dxos/plugin-script/plugin';
import { TableBlueprint } from '@dxos/plugin-table';
import { TableOperationHandlerSet } from '@dxos/plugin-table/plugin';
import { ThreadBlueprint } from '@dxos/plugin-thread';
import { ThreadOperationHandlerSet } from '@dxos/plugin-thread/plugin';
import { TranscriptionBlueprint } from '@dxos/plugin-transcription';
import { TranscriptionOperationHandlerSet } from '@dxos/plugin-transcription/plugin';
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
  ChessOperationHandlerSet,
  InboxOperationHandlerSet,
  KanbanOperationHandlerSet,
  MapOperationHandlerSet,
  MarkdownOperationHandlerSet,
  ScriptOperationHandlerSet,
  TableOperationHandlerSet,
  ThreadOperationHandlerSet,
  TranscriptionOperationHandlerSet,
);

export const toolkits: OpaqueToolkit.OpaqueToolkit[] = [
  // NOTE: Toolkits referenced by blueprints above need to be added here.
  OpaqueToolkit.make(WebSearchToolkit, Layer.empty),

  // TODO(burdon): Remove?
  OpaqueToolkit.make(TestToolkit.toolkit, TestToolkit.layer),
];

export const types: Type.AnyEntity[] = [
  // NOTE: Types referenced by blueprints above need to be added here.
  DataTypes,
  [Chat.Chat],
  [Game, Chess.State],
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
