//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { CloudRunOperation } from '#types';

export const key = 'org.dxos.skill.claude.cloudCoding';

/** Operation definitions behind the skill's tools, for hosts without a registry to resolve ToolIds. */
export const operations: readonly Operation.Definition.Any[] = [
  CloudRunOperation.StartCloudRun,
  CloudRunOperation.SyncCloudRun,
];

/** Hands project tasks to Claude Code on EDGE; offered over MCP, so a coding session elsewhere can delegate. */
export const make = (): Skill.Skill =>
  Skill.make({
    key,
    name: 'Cloud Coding',
    description:
      "Hand a project's tasks to Claude Code running on EDGE, which works in the project's repositories and opens a " +
      'draft pull request per repository. Use when asked to have tasks coded in the cloud, or to delegate coding work.',
    mcpPrompt: true,
    agentCanEnable: true,
    tools: Skill.toolDefinitions({ operations: [...operations] }),
    instructions: Template.make({
      source: trim`
        A cloud coding run hands tasks to Claude Code in an EDGE sandbox, billed to the space's Claude subscription. It
        checks out the repositories of the tasks' project, the first one as its working directory, so set those first
        (the project skill's Update Project Repositories).

        1. Start Cloud Coding Run with the tasks. When a task has no assignee, pass \`assignee\` with the identityDid
           and name whoami returns: a delegated task answers to a person. It returns the run's chat and \`done\`.
        2. While \`done\` is false the agent is working: call Sync Cloud Coding Run with the chat, again and again. Each
           call folds the agent's progress into the chat and waits up to a minute for more.
        3. When \`done\` is true, \`pullRequests\` lists the draft pull requests the agent opened. They are already
           attached to the tasks, which are now in review; report them.

        A run takes minutes to hours. Do not start a second run for the same tasks: tasks an agent holds are skipped.
      `,
    }),
  });
