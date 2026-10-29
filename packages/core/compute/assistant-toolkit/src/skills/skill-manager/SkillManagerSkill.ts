//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

import {
  AddMcpConnection,
  EnableSkills,
  QueryMcpConnections,
  QuerySkills,
  SetMcpConnection,
} from './operations/definitions.ts';

export const key = 'org.dxos.skill.skillManager';

export const make = () =>
  Skill.make({
    key,
    name: 'Skill Manager',
    description: 'Query and enable skills and MCP servers in the current conversation.',
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

        When the task needs a tool you do not have, do not work around it with other tools: call
        [query-skills] with a \`query\` describing the tool (e.g. "link task to feature"). Each skill it
        returns lists the tools it provides; enable the one that has the tool you need.

        Connections to services can also give you their MCP servers' tools. A space's connections are
        on unless this conversation turned them off; the built-in servers Composer ships are off until
        turned on. Use [query-mcp-connections] to see which are off, and [set-mcp-connection] to turn
        one on when you need its tools; they are available from your next step. A connection is not a
        skill, and enabling a skill does not turn its server on.
        To use an MCP server the space has no connection for, add it with [add-mcp-connection].
      `,
      inputs: [
        {
          name: 'skills',
          kind: 'operation',
          operation: DXN.getName(QuerySkills.meta.key),
        },
      ],
    }),
    tools: Skill.toolDefinitions({
      operations: [QuerySkills, EnableSkills, AddMcpConnection, QueryMcpConnections, SetMcpConnection],
    }),
  });

export { SkillManagerHandlers as Handlers } from './operations/index.ts';
export * as Operations from './operations/definitions.ts';
