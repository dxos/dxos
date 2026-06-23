//
// Copyright 2026 DXOS.org
//

import { Skill, Template } from '@dxos/compute';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

import { EnableSkills, QuerySkills } from './operations/definitions';

const SKILL_KEY = 'org.dxos.skill.skillManager';

const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Skill Manager',
    description: 'Query and enable skills in the current conversation.',
    instructions: Template.make({
      source: trim`
        You can query available skills and enable them in the current conversation.
        Use [query-skills] to refresh the list of available skills.
        Use [enable-skills] to enable skills by their keys. Always call [query-skills] first.
        Only skills with agentCanEnable=true can be enabled by the agent.

        <available_skills>
        {{#each skills}}
        - {{key}} "{{name}}"{{#if description}} -- {{description}}{{/if}}{{#if agentCanEnable}} [agent-can-enable]{{/if}}
        {{/each}}
        </available_skills>

        NOTE: You must enable the skill to use it, only then the tools from that skill will appear.
      `,
      inputs: [
        {
          name: 'skills',
          kind: 'operation',
          operation: DXN.getName(QuerySkills.meta.key),
        },
      ],
    }),
    tools: Skill.toolDefinitions({ operations: [QuerySkills, EnableSkills] }),
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;
