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
  QueryOperations,
  QuerySkills,
  QueryTypes,
  SetMcpConnection,
} from './operations/definitions.ts';

export const key = 'org.dxos.skill.skillManager';

const name = 'Skill Manager';

const description = 'Query and enable skills, their operations, types and MCP servers in the current conversation.';

const tools = Skill.toolDefinitions({
  operations: [
    QuerySkills,
    EnableSkills,
    QueryOperations,
    QueryTypes,
    AddMcpConnection,
    QueryMcpConnections,
    SetMcpConnection,
  ],
});

export const make = () =>
  Skill.make({
    key,
    name,
    description,
    instructions: Template.make({
      source: trim`
        The list below is the current set of available skills — it is rendered fresh into this prompt,
        so do NOT call [query-skills] to obtain it. Call [enable-skills] directly with the keys you
        need; only skills marked [agent-can-enable] can be enabled by the agent.
        Reach for [query-skills] only to re-read the list after something has changed it.

        <available_skills>
        {{#each skills}}
        - {{key}} "{{name}}"{{#if description}} -- {{description}}{{/if}}{{#if enabled}} [enabled]{{/if}}{{#if agentCanEnable}} [agent-can-enable]{{/if}}
        {{/each}}
        </available_skills>

        NOTE: A skill's tools only appear once it is enabled. Skills already enabled in this
        conversation expose their tools to you directly — do not re-enable a skill whose tools you
        can already see.

        When the task needs a tool you do not have, do not work around it with other tools: call
        [query-operations] with a \`query\` describing what it does (e.g. "link task to feature"). Each
        operation it returns names the skill that provides it; enable that skill. [query-types] lists
        the registered types, and with \`typenames\` their fields.

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
    tools,
  });

/**
 * The skill as code mode states it: the same operations, called from code, and instructions that list nothing. Code
 * mode's prompt states no other skill, operation or type, so these are how the model finds them.
 */
export const makeForCodeMode = () =>
  Skill.make({
    key,
    name,
    description,
    instructions: Template.make({
      source: trim`
        Nothing about this workspace is listed in this prompt. Its skills, their operations and its types
        are found with the Skill Manager's operations, which the Operations section lists with the code
        that calls each.

        - Query skills lists the skills, each saying whether it is enabled here and whether you may
          enable it. An enabled skill carries the rules for its part of the work, so at the start of a
          request get each one the request touches in full by passing its key in \`keys\`, and follow its
          instructions.
        - Query operations searches the operations of the skills you can use by what they do
          (\`query\`), or lists one skill's (\`skill\`). Look an operation up by passing its key in
          \`keys\` before calling it: that gives its input. Call it the way the Operations section calls
          the Skill Manager's own, by its \`key\` or its \`tool\` name.
        - An operation whose skill is not enabled cannot be called yet. Enable the skill with Enable
          skills (only one you may enable); its operations can be called from your next eval call.
        - Query types searches the registered types (\`query\`); pass \`typenames\` to get their fields.
        - A connection's MCP tools are on unless this conversation turned them off: Query MCP
          connections lists them, and Set MCP connection turns one on from your next eval call.

        Find what a request needs in one eval call that prints it, then do the work in the next.
      `,
    }),
    tools,
  });

export { SkillManagerHandlers as Handlers } from './operations/index.ts';
export * as Operations from './operations/definitions.ts';
