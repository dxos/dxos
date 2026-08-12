//
// Copyright 2026 DXOS.org
//

import * as Skill from '@dxos/compute/Skill';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';

// The workflow content lives beside this module as markdown so it can be edited as prose.
import instructions from './projects-skill.md?raw';

const SKILL_KEY = 'org.dxos.plugin.projects.skill.projects';

/**
 * Space-backed project-management workflow (the task-planning skill's successor — mcp-operations
 * DESIGN §0). Distinct from assistant-toolkit's `org.dxos.skill.project` (a chat-context skill
 * for filing artifacts): this one manages the project/task/outline objects themselves and is
 * written for external agents driving the projected MCP verbs. The final key segment doubles as
 * the projected MCP prompt name, so it must not collide with that skill's `project`.
 */
const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Projects',
    description:
      'Manage work-stream projects, tasks and design docs stored in the space (successor to repo-file task tracking).',
    agentCanEnable: true,
    instructions: {
      source: Ref.make(Text.make({ content: instructions })),
    },
    tools: [],
  });

export const ProjectsSkillDefinition: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default ProjectsSkillDefinition;
