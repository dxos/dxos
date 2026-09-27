//
// Copyright 2026 DXOS.org
//

import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

import { ConnectMcpServer, EnableSkills, QuerySkills } from './operations/definitions.ts';

const SKILL_KEY = 'org.dxos.skill.skillManager';

const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Skill Manager',
    description: 'Query and enable skills in the current conversation, and connect MCP servers to them.',
    instructions: Template.make({
      source: trim`
        The list below is the current set of available skills — it is rendered fresh into this prompt,
        so do NOT call [query-skills] to obtain it. Call [enable-skills] directly with the keys you
        need; only skills marked [agent-can-enable] can be enabled by the agent.
        Reach for [query-skills] only to re-read the list after something has changed it.

        <available_skills>
        {{#each skills}}
        - {{key}} "{{name}}"{{#if description}} -- {{description}}{{/if}}{{#if agentCanEnable}} [agent-can-enable]{{/if}}
        {{/each}}
        </available_skills>

        NOTE: A skill's tools only appear once it is enabled. Skills already enabled in this
        conversation expose their tools to you directly — do not re-enable a skill whose tools you
        can already see.

        To give a skill an MCP server, call [connect-mcp-server] rather than editing the skill's
        mcpServers yourself: it checks the server answers first and reports why when it does not.
        The server's tools appear on your next tool-calling step of this same run — not in the
        response that connects it, and without waiting for a new message.
      `,
      inputs: [
        {
          name: 'skills',
          kind: 'operation',
          operation: DXN.getName(QuerySkills.meta.key),
        },
      ],
    }),
    tools: Skill.toolDefinitions({ operations: [QuerySkills, EnableSkills, ConnectMcpServer] }),
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;
