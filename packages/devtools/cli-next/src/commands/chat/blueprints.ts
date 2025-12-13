//
// Copyright 2025 DXOS.org
//

import * as Layer from 'effect/Layer';
import type * as Schema from 'effect/Schema';

import { GenericToolkit } from '@dxos/assistant';
import { AssistantToolkit, SystemToolkit, WebSearchToolkit } from '@dxos/assistant-toolkit';
import { Blueprint } from '@dxos/blueprints';
import { type FunctionDefinition } from '@dxos/functions';
import { blueprints as AssistantBlueprints, functions as AssistantFunctions } from '@dxos/plugin-assistant/blueprints';
import { ChessBlueprint } from '@dxos/plugin-chess/blueprints';
import { Chess } from '@dxos/plugin-chess/types';

import { TestToolkit } from '../../util';

export const blueprintRegistry = new Blueprint.Registry([
  // Blueprints available to the chat.
  ...AssistantBlueprints,
  ChessBlueprint.make(),
]);

// TODO(dmaretskyi): In Composer, those are handled by the plugins and capabilities mechanism.
//  But since CLI doesn't have this, we have to manually collect them and configure them here.
//  Providing functions and toolkits are essential to the blueprint operation,
//  since blueprints referencing tools and functions that are not included here will produce a "tool not found" error.

export const functions: FunctionDefinition.Any[] = [
  // NOTE: Functions referenced by blueprints above need to be added here.
  ...AssistantFunctions,
  ...ChessBlueprint.functions,
];

export const toolkits: GenericToolkit.GenericToolkit[] = [
  // NOTE: Toolkits referenced by blueprints above need to be added here.
  GenericToolkit.make(AssistantToolkit.AssistantToolkit, AssistantToolkit.layer()),
  GenericToolkit.make(SystemToolkit.SystemToolkit, SystemToolkit.layer()),
  GenericToolkit.make(TestToolkit.toolkit, TestToolkit.layer),
  GenericToolkit.make(WebSearchToolkit, Layer.empty),
];

export const types: Schema.Schema.AnyNoContext[] = [
  // NOTE: Types referenced by blueprints above need to be added here.
  [Chess.Game],
].flat();
