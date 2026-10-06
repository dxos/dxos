//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Skill from '@dxos/compute/Skill';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';

import { Fetch } from './operations/definitions.ts';
import { WebSearchToolkit } from './toolkit.ts';

export const key = 'org.dxos.skill.webSearch';

export const make = () =>
  Skill.make({
    key,
    name: 'Web Search',
    description: 'Search the web.',
    agentCanEnable: true,
    instructions: {
      source: Ref.make(Text.make()),
    },
    tools: Skill.toolDefinitions({ operations: [Fetch], tools: [WebSearchToolkit.tools.AnthropicWebSearch.name] }),
  });

export { WebSearchHandlers as Handlers } from './operations/index.ts';
export * as Operations from './operations/definitions.ts';
export { WebSearchToolkit as Toolkit, WebSearchToolkitOpaque as ToolkitOpaque } from './toolkit.ts';
