//
// Copyright 2026 DXOS.org
//

import * as Skill from '@dxos/compute/Skill';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';

import { ArtifactAdd, ArtifactList } from './operations/definitions';
// The workflow content lives beside this module as markdown so it can be edited as prose.
import instructions from './project-skill.md?raw';

const SKILL_KEY = 'org.dxos.skill.project';

/**
 * Tool names for the project verbs owned by `plugin-projects` and `plugin-tasks`, which this
 * package sits below and cannot import. Named rather than derived, so the list rots silently if a
 * plugin re-keys an operation — `plugin-projects`' `project-skill.test.ts` resolves every entry
 * against the real definitions to catch that.
 */
const PLUGIN_TOOLS = [
  'projects-list',
  'projects-get',
  'projects-create',
  'projects-update',
  'tasks-list',
  'tasks-create',
  'tasks-update',
  'tasks-complete',
  'tasks-assign',
  'tasks-list-milestone',
  'tasks-create-milestone',
  'tasks-update-milestone',
  'tasks-delete-milestone',
  'tasks-get-outline',
  'tasks-update-outline',
];

/**
 * The project skill: work-stream projects with task ledgers, outlines, design documents and
 * artifacts in an ECHO space, for both a project-scoped chat and an agent driving the projected
 * MCP verbs.
 *
 * It lives here rather than in `plugin-projects` because `Project` is a compute type and every
 * consumer — a Composer chat, the CLI MCP host, a headless agent — sits above this package. The
 * plugin verbs it drives are named, not imported, which is what keeps that direction intact.
 *
 * The final key segment doubles as the projected MCP prompt name, so this skill answers to
 * `/project`.
 */
const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Project',
    description:
      'Track multi-step work as projects, tasks and design docs in a DXOS space, and file the work ' +
      'products into the project. Use when work spans 3+ steps or phases, will outlive one session, ' +
      'when the user asks for a plan or progress, when filing a created object into a project, or on ' +
      'any /project verb.',
    agentCanEnable: true,
    mcpPrompt: true,
    instructions: {
      source: Ref.make(Text.make({ content: instructions })),
    },
    tools: Skill.toolDefinitions({
      operations: [ArtifactAdd, ArtifactList],
      tools: PLUGIN_TOOLS,
    }),
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
  operations: [ArtifactAdd, ArtifactList],
};

export default skill;
