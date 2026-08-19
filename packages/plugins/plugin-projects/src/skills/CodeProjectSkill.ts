//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Ref } from '@dxos/echo';
import * as OutlineOperation from '@dxos/plugin-tasks/OutlineOperation';
import * as TaskOperation from '@dxos/plugin-tasks/TaskOperation';
import { Text } from '@dxos/schema';

import { ProjectMcpOperation, ProjectOperation } from '#types';

// The workflow content lives beside this module as markdown so it can be edited as prose.
import instructions from './code-project-skill.md?raw';

export const key = 'org.dxos.plugin.projects.skill.codeProject';

/**
 * Project-management workflow for agents driving the projected MCP verbs: work-stream projects
 * with task ledgers, outlines, and design documents in an ECHO space.
 *
 * The final key segment doubles as the projected MCP prompt name, so this skill answers to
 * `/codeProject`. Plain `project` belongs to assistant-toolkit's `org.dxos.skill.project`, a
 * chat-context skill for filing artifacts; a shared segment would be a prompt-name collision, which
 * the projection raises rather than resolving silently.
 */
/**
 * The workflow's verbs. Listing them here is what projects them as MCP tools: the skill definition
 * is the atomic unit of projection, and a tool's load-the-skill-first pointer derives from this
 * membership. Task and outline verbs live in plugin-tasks (a real dependency already); filing tasks
 * into a project's task set is this workflow's job, so the skill that owns the workflow lists them.
 */
export const operations: readonly Operation.Definition.Any[] = [
  ProjectOperation.Create,
  ProjectMcpOperation.ListProjects,
  ProjectMcpOperation.GetProject,
  ProjectMcpOperation.UpdateProject,
  TaskOperation.CreateTask,
  TaskOperation.UpdateTask,
  TaskOperation.CompleteTask,
  TaskOperation.AssignTask,
  TaskOperation.ListTasks,
  OutlineOperation.GetOutline,
  OutlineOperation.UpdateOutline,
];

export const make = (): Skill.Skill =>
  Skill.make({
    key,
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
    tools: Skill.toolDefinitions({ operations }),
  });
