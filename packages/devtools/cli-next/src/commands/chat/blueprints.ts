//
// Copyright 2025 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { ArtifactId, GenericToolkit } from '@dxos/assistant';
import { AssistantToolkit, SystemToolkit, WebSearchToolkit } from '@dxos/assistant-toolkit';
import { Blueprint } from '@dxos/blueprints';
import { type FunctionDefinition } from '@dxos/functions';
import { blueprints as AssistantBlueprints, functions as AssistantFunctions } from '@dxos/plugin-assistant/blueprints';
import { ChessBlueprint } from '@dxos/plugin-chess/blueprints';
import { Chess } from '@dxos/plugin-chess/types';
import { CalendarBlueprint, InboxBlueprint } from '@dxos/plugin-inbox/blueprints';
import { KanbanBlueprint } from '@dxos/plugin-kanban/blueprints';
import { MapBlueprint } from '@dxos/plugin-map/blueprints';
import { MarkdownBlueprint } from '@dxos/plugin-markdown/blueprints';
import { Markdown } from '@dxos/plugin-markdown/types';
import { ScriptBlueprint } from '@dxos/plugin-script/blueprints';
import { TableBlueprint } from '@dxos/plugin-table/blueprints';
import { ThreadBlueprint } from '@dxos/plugin-thread/blueprints';
import { TranscriptionBlueprint } from '@dxos/plugin-transcription/blueprints';

import { TestToolkit } from '../../util';

export const blueprintRegistry = new Blueprint.Registry([
  // Blueprints available to the chat.
  ...AssistantBlueprints,
  CalendarBlueprint.make(),
  ChessBlueprint.make(),
  InboxBlueprint.make(),
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

export const functions: FunctionDefinition.Any[] = [
  // NOTE: Functions referenced by blueprints above need to be added here.
  ...AssistantFunctions,
  ...CalendarBlueprint.functions,
  ...ChessBlueprint.functions,
  ...InboxBlueprint.functions,
  ...KanbanBlueprint.functions,
  ...MapBlueprint.functions,
  ...MarkdownBlueprint.functions,
  ...ScriptBlueprint.functions,
  ...TableBlueprint.functions,
  ...ThreadBlueprint.functions,
  ...TranscriptionBlueprint.functions,
];

const StubDeckToolkit = Toolkit.make(
  Tool.make('open-item', {
    description: 'Opens an item in the application.',
    parameters: { id: ArtifactId },
    success: Schema.Any,
    failure: Schema.Never,
  }),
);

export const toolkits: GenericToolkit.GenericToolkit[] = [
  // NOTE: Toolkits referenced by blueprints above need to be added here.
  GenericToolkit.make(AssistantToolkit.AssistantToolkit, AssistantToolkit.layer()),
  GenericToolkit.make(SystemToolkit.SystemToolkit, SystemToolkit.layer()),
  GenericToolkit.make(WebSearchToolkit, Layer.empty),

  // TODO(burdon): Remove?
  GenericToolkit.make(TestToolkit.toolkit, TestToolkit.layer),

  // TODO(burdon): Remove Composer tools.
  GenericToolkit.make(
    StubDeckToolkit,
    StubDeckToolkit.toLayer({
      'open-item': ({ id }) => Effect.logInfo('open item', { id }),
    }),
  ),
];

export const types: Schema.Schema.AnyNoContext[] = [
  // NOTE: Types referenced by blueprints above need to be added here.
  [Chess.Game],
  [Markdown.Document],
].flat();
