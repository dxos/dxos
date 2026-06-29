//
// Copyright 2025 DXOS.org
//

import * as Layer from 'effect/Layer';

import { OpaqueToolkit } from '@dxos/ai';
import { Chat, WebSearchToolkit } from '@dxos/assistant-toolkit';
import { DatabaseHandlers, DatabaseSkill } from '@dxos/assistant-toolkit';
import { OperationHandlerSet, Skill } from '@dxos/compute';
import { type Type, Feed, Tag } from '@dxos/echo';
import { makeRegistry } from '@dxos/echo-client';
// Narrow subpath imports (`/skills` and `/types`) so the CLI's
// `bun run --conditions=source` only walks plugin source files that are free of
// React-component imports. The plugin root barrels re-export the whole tree
// (including React components that transitively pull `react-aria-components` —
// whose `source` export condition advertises a TS file that isn't shipped in
// its dist, causing Bun resolution to fail).
import { AssistantSkill } from '@dxos/plugin-assistant/skills';
import { ChessOperationHandlerSet } from '@dxos/plugin-chess/plugin';
import { ChessSkill } from '@dxos/plugin-chess/skills';
import { Chess } from '@dxos/plugin-chess/types';
import { CommentOperationHandlerSet } from '@dxos/plugin-comments/plugin';
import { CommentSkill } from '@dxos/plugin-comments/skills';
import { Game } from '@dxos/plugin-game/types';
import { InboxOperationHandlerSet } from '@dxos/plugin-inbox/plugin';
import { CalendarSkill, InboxSendSkill, InboxSkill } from '@dxos/plugin-inbox/skills';
import { Calendar, Mailbox } from '@dxos/plugin-inbox/types';
import { KanbanOperationHandlerSet } from '@dxos/plugin-kanban/plugin';
import { KanbanSkill } from '@dxos/plugin-kanban/skills';
import { MapOperationHandlerSet } from '@dxos/plugin-map/plugin';
import { MapSkill } from '@dxos/plugin-map/skills';
import { MarkdownOperationHandlerSet } from '@dxos/plugin-markdown/plugin';
import { MarkdownSkill } from '@dxos/plugin-markdown/skills';
import { Markdown } from '@dxos/plugin-markdown/types';
import { ScriptOperationHandlerSet } from '@dxos/plugin-script/plugin';
import { ScriptSkill } from '@dxos/plugin-script/skills';
import { TableOperationHandlerSet } from '@dxos/plugin-table/plugin';
import { TableSkill } from '@dxos/plugin-table/skills';
import { TranscriptionOperationHandlerSet } from '@dxos/plugin-transcription/plugin';
import { TranscriptionSkill } from '@dxos/plugin-transcription/skills';
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
  DatabaseHandlers,
  ChessOperationHandlerSet,
  InboxOperationHandlerSet,
  KanbanOperationHandlerSet,
  MapOperationHandlerSet,
  MarkdownOperationHandlerSet,
  ScriptOperationHandlerSet,
  TableOperationHandlerSet,
  CommentOperationHandlerSet,
  TranscriptionOperationHandlerSet,
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
  [Game, Chess.State],
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
