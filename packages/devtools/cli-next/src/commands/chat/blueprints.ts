//
// Copyright 2025 DXOS.org
//

import * as Layer from 'effect/Layer';

import { GenericToolkit } from '@dxos/assistant';
import { Research, ResearchBlueprint, WebSearchBlueprint, WebSearchToolkit } from '@dxos/assistant-toolkit';
import { Blueprint } from '@dxos/blueprints';
import type { FunctionDefinition } from '@dxos/functions';
import { createBlueprint } from '@dxos/plugin-assistant/blueprints';

import { TestToolkit } from '../../util';

const AssistantBlueprint = createBlueprint();
export const blueprintRegistry = new Blueprint.Registry([
  // Blueprints available to the chat.
  AssistantBlueprint,
  ResearchBlueprint,
  WebSearchBlueprint,
]);

// TODO(dmaretskyi): In Composer, those are handled by the plugins and capabilities mechanism.
// But since CLI doesn't have this, we have to manually collect them and configure them here.
// Providing functions and toolkits are essential to the blueprint operation,
// since blueprints referencing tools and functions that are not included here will produce a "tool not found" error.

export const functions: FunctionDefinition.Any[] = [
  // NOTE: Functions referenced by blueprints above need to be added here.
  Research.create,
  Research.research,
];

export const toolkits: GenericToolkit.GenericToolkit[] = [
  // NOTE: Toolkits referenced by blueprints above need to be added here.
  GenericToolkit.make(TestToolkit.toolkit, TestToolkit.layer),
  GenericToolkit.make(WebSearchToolkit, Layer.empty),
];
