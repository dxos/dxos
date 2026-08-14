//
// Copyright 2026 DXOS.org
//

import * as Skill from '@dxos/compute/Skill';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';

// The workflow content lives beside this module as markdown so it can be edited as prose.
import instructions from './code-project-skill.md?raw';

const SKILL_KEY = 'org.dxos.plugin.projects.skill.codeProject';

/**
 * Project-management workflow for agents driving the projected MCP verbs: work-stream projects
 * with task ledgers, outlines, and design documents in an ECHO space.
 *
 * The final key segment doubles as the projected MCP prompt name, so this skill answers to
 * `/codeProject`. Plain `project` belongs to assistant-toolkit's `org.dxos.skill.project`, a
 * chat-context skill for filing artifacts; a shared segment would be a prompt-name collision, which
 * the projection raises rather than resolving silently.
 */
const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Projects',
    description:
      'Track multi-step work as projects, tasks and design docs in a DXOS space. Use when work spans 3+ steps ' +
      'or phases, will outlive one session, when the user asks for a plan or progress, on any /codeProject verb, ' +
      "or when asked to set up, bind or configure this repo's project space (/codeProject setup).",
    agentCanEnable: true,
    mcpPrompt: true,
    instructions: {
      source: Ref.make(Text.make({ content: instructions })),
    },
    tools: [],
  });

export const CodeProjectSkillDefinition: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default CodeProjectSkillDefinition;
