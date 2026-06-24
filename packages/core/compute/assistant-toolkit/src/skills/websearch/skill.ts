//
// Copyright 2025 DXOS.org
//

import { Skill } from '@dxos/compute';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';

import { Fetch } from './operations/definitions';
import { WebSearchToolkit, WebSearchToolkitOpaque } from './toolkit';

const SKILL_KEY = 'org.dxos.skill.webSearch';

const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Web Search',
    description: 'Search the web.',
    agentCanEnable: true,
    instructions: {
      source: Ref.make(Text.make()),
    },
    tools: Skill.toolDefinitions({ operations: [Fetch], tools: [WebSearchToolkit.tools.AnthropicWebSearch.name] }),
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;
