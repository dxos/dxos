//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { Database } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

const INSTRUCTIONS = trim`
  Carries the weather MCP server this project deploys. Its \`mcpServers\` list starts empty: the
  Worker URL only exists once the deploy has run, and the run sets it here — preferably with the Skill
  Manager's connect-mcp-server tool, which checks the server answers first. A chat with this skill
  bound connects every listed server before each model call, so the \`get_weather\` tool appears on
  the next tool-calling step of the same run: not in the response that sets the URL, and with no new
  message needed.
`;

export type SkillResult = { skill: Skill.Skill };

/**
 * The skill the deployed server hangs off. Seeded rather than created by the run because a skill is
 * the one place a chat reads MCP servers from, and the project's instructions can bind a seeded
 * object — so configuring the server is one field update, not a skill to author and enable.
 */
export const WeatherSkill: SampleSpace.Phase<SkillResult> = SampleSpace.phase('skill', {
  schemas: [Skill.Skill, Text.Text],
  run: () =>
    Effect.gen(function* () {
      const skill = yield* Database.add(
        Skill.make({
          key: 'org.dxos.skill.weatherMcp',
          name: 'Weather MCP',
          description: 'The weather MCP server deployed by this project.',
          instructions: Template.make({ source: INSTRUCTIONS }),
          mcpServers: [],
          agentCanEnable: true,
        }),
      );

      return { skill };
    }),
});
