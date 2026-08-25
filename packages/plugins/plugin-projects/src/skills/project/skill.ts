//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Ref } from '@dxos/echo';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import * as OutlineOperation from '@dxos/plugin-tasks/OutlineOperation';
import * as TaskOperation from '@dxos/plugin-tasks/TaskOperation';
import { Text } from '@dxos/schema';

import { ProjectMcpOperation, ProjectOperation } from '#types';

import { ArtifactAdd, ArtifactList } from './operations/definitions';
// The workflow content lives beside this module as markdown so it can be edited as prose.
import instructions from './project-skill.md?raw';

const SKILL_KEY = 'org.dxos.skill.project';

/**
 * Every verb the skill drives. Imported rather than named as strings: an unresolvable ToolId is
 * dropped from the session toolkit with only a log line, so a re-keyed or unregistered operation
 * would otherwise cost the model a tool with nothing to show for it.
 */
export const operations: readonly Operation.Definition.Any[] = [
  // Generic object verbs, for the reads and writes that carry no invariant of their own: creating
  // a design document, finding a project by typename, and patching a milestone's fields.
  SpaceOperation.AddObject,
  SpaceOperation.QueryObjects,
  SpaceOperation.UpdateObject,
  ProjectOperation.Create,
  ProjectMcpOperation.GetProject,
  ProjectMcpOperation.UpdateProject,
  TaskOperation.CreateTask,
  TaskOperation.UpdateTask,
  TaskOperation.ListTasks,
  TaskOperation.CreateMilestone,
  TaskOperation.DeleteMilestone,
  TaskOperation.MoveMilestone,
  TaskOperation.ListMilestones,
  OutlineOperation.GetOutline,
  OutlineOperation.UpdateOutline,
  ArtifactAdd,
  ArtifactList,
];

/**
 * The project skill: work-stream projects with task ledgers, outlines, design documents and
 * artifacts in an ECHO space, for both a project-scoped chat and an agent driving the projected
 * MCP verbs.
 *
 * It lives in this plugin because the plugin owns the verbs it drives — `Project` is a compute
 * type, but a skill that cannot import its own operations can only name them and hope.
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
    tools: Skill.toolDefinitions({ operations }),
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
  operations,
};

export default skill;
