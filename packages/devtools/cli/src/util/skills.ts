//
// Copyright 2025 DXOS.org
//

import * as Layer from 'effect/Layer';

// Per-symbol subpath imports so the CLI's `bun run --conditions=source` only walks plugin source
// files that are free of React-component imports. The plugin root barrels re-export the whole tree
// (including React components that transitively pull `react-aria-components` — whose `source`
// export condition advertises a TS file that isn't shipped in its dist, causing Bun resolution to
// fail).
import { OpaqueToolkit } from '@dxos/ai';
import { WebSearchToolkit } from '@dxos/assistant-toolkit';
import { ChatContextHandlers, ChatContextSkill } from '@dxos/assistant-toolkit';
import * as Chat from '@dxos/assistant/Chat';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Skill from '@dxos/compute/Skill';
import { Feed, Tag, type Type } from '@dxos/echo';
import { makeRegistry } from '@dxos/echo-client';
import * as AssistantSkill from '@dxos/plugin-assistant/AssistantSkill';
import * as Chess from '@dxos/plugin-chess/Chess';
import * as ChessOperationHandlerSet from '@dxos/plugin-chess/ChessOperationHandlerSet';
import * as ChessSkill from '@dxos/plugin-chess/ChessSkill';
import * as Game from '@dxos/plugin-game/Game';
import * as GoogleOperationHandlerSet from '@dxos/plugin-google/GoogleOperationHandlerSet';
import * as Calendar from '@dxos/plugin-inbox/Calendar';
import * as CalendarSkill from '@dxos/plugin-inbox/CalendarSkill';
import * as InboxOperationHandlerSet from '@dxos/plugin-inbox/InboxOperationHandlerSet';
import * as InboxSendSkill from '@dxos/plugin-inbox/InboxSendSkill';
import * as InboxSkill from '@dxos/plugin-inbox/InboxSkill';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import * as JmapOperationHandlerSet from '@dxos/plugin-jmap/JmapOperationHandlerSet';
import * as KanbanOperationHandlerSet from '@dxos/plugin-kanban/KanbanOperationHandlerSet';
import * as KanbanSkill from '@dxos/plugin-kanban/KanbanSkill';
import * as MapOperationHandlerSet from '@dxos/plugin-map/MapOperationHandlerSet';
import * as MapSkill from '@dxos/plugin-map/MapSkill';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as MarkdownOperationHandlerSet from '@dxos/plugin-markdown/MarkdownOperationHandlerSet';
import * as MarkdownSkill from '@dxos/plugin-markdown/MarkdownSkill';
import * as CommentOperationHandlerSet from '@dxos/plugin-review/CommentOperationHandlerSet';
import * as CommentSkill from '@dxos/plugin-review/CommentSkill';
import * as ScriptOperationHandlerSet from '@dxos/plugin-script/ScriptOperationHandlerSet';
import * as ScriptSkill from '@dxos/plugin-script/ScriptSkill';
import * as DatabaseSkill from '@dxos/plugin-space/DatabaseSkill';
import * as SpaceOperationHandlerSet from '@dxos/plugin-space/SpaceOperationHandlerSet';
import * as TableOperationHandlerSet from '@dxos/plugin-table/TableOperationHandlerSet';
import * as TableSkill from '@dxos/plugin-table/TableSkill';
import * as TranscriptionOperationHandlerSet from '@dxos/plugin-transcription/TranscriptionOperationHandlerSet';
import * as TranscriptionSkill from '@dxos/plugin-transcription/TranscriptionSkill';
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

export const skillRegistry = makeRegistry({
  initial: [
    // Skills available to the chat.
    AssistantSkill.make(),
    DatabaseSkill.make(),
    ChatContextSkill.make(),
    CalendarSkill.make(),
    ChessSkill.make(),
    InboxSkill.make(),
    InboxSendSkill.make(),
    KanbanSkill.make(),
    MapSkill.make(),
    MarkdownSkill.make(),
    ScriptSkill.make(),
    TableSkill.make(),
    CommentSkill.make(),
    TranscriptionSkill.make(),
  ],
});

// TODO(dmaretskyi): In Composer, those are handled by the plugins and capabilities mechanism.
//  But since CLI doesn't have this, we have to manually collect them and configure them here.
//  Providing functions and toolkits are essential to the skill operation,
//  since skills referencing tools and functions that are not included here will produce a "tool not found" error.

export const operationHandlers = OperationHandlerSet.merge(
  // NOTE: Operation handlers referenced by skills above need to be added here.
  ChatContextHandlers,
  SpaceOperationHandlerSet.handlers,
  ChessOperationHandlerSet.handlers,
  InboxOperationHandlerSet.handlers,
  // Mail-provider handlers: InboxSendSkill / CalendarSkill reference provider ops, and a missing
  // handler set surfaces only at runtime as "tool not found".
  GoogleOperationHandlerSet.handlers,
  JmapOperationHandlerSet.handlers,
  KanbanOperationHandlerSet.handlers,
  MapOperationHandlerSet.handlers,
  MarkdownOperationHandlerSet.handlers,
  ScriptOperationHandlerSet.handlers,
  TableOperationHandlerSet.handlers,
  CommentOperationHandlerSet.handlers,
  TranscriptionOperationHandlerSet.handlers,
);

export const toolkits: OpaqueToolkit.OpaqueToolkit[] = [
  // NOTE: Toolkits referenced by skills above need to be added here.
  OpaqueToolkit.make(WebSearchToolkit, Layer.empty),

  // TODO(burdon): Remove?
  OpaqueToolkit.make(TestToolkit.toolkit, TestToolkit.layer),
];

export const types: Type.AnyEntity[] = [
  // NOTE: Types referenced by skills above need to be added here.
  DataTypes,
  [Chat.Chat],
  [Game.Game, Chess.State],
  [Markdown.Document],
  [Mailbox.Mailbox, Calendar.Calendar, Feed.Feed],
  [Skill.Skill],
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
