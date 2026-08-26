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

import { ProjectOperation } from '#types';

// The workflow content lives beside this module as markdown so it can be edited as prose.
import instructions from './project-skill.md?raw';

export const key = 'org.dxos.skill.project';

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
  ProjectOperation.GetProject,
  TaskOperation.CreateTask,
  TaskOperation.UpdateTask,
  TaskOperation.ListTasks,
  TaskOperation.CreateMilestone,
  TaskOperation.DeleteMilestone,
  TaskOperation.MoveMilestone,
  TaskOperation.ListMilestones,
  OutlineOperation.GetOutline,
  OutlineOperation.UpdateOutline,
  ProjectOperation.ArtifactAdd,
  ProjectOperation.ArtifactList,
];

/**
 * The project skill: work-stream projects with task ledgers, outlines, design documents and
 * artifacts in an ECHO space, for both a project-scoped chat and an agent driving the projected
 * MCP verbs.
 *
 * It lives in this plugin because the plugin owns the verbs it drives — `Project` is a compute
 * type, but a skill that cannot import its own operations can only name them and hope.
 *
 * TODO(wittjosiah): Factor back out to a lower layer so a headless host can serve it without the
 * plugins. Blocked on where the operations live: every verb below is defined by a plugin
 * (`plugin-space`, `plugin-tasks`, this one), so a lower home could only name them as strings
 * again — which is the failure mode that put the skill here. Moving the operation definitions
 * down is the prerequisite, not moving the skill.
 *
 * The final key segment doubles as the projected MCP prompt name, so this skill answers to
 * `/project`.
 */
export const make = (): Skill.Skill =>
  Skill.make({
    key,
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
