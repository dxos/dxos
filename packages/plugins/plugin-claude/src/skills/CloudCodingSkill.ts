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
  CloudRunOperation.DriveCloudRuns,
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
           call folds the agent's progress into the chat and waits up to half a minute for more.
        3. When \`done\` is true, \`pullRequests\` lists the draft pull requests the agent opened. They are already
           attached to the tasks, which are now in review; report them. With no pull request the tasks are
           blocked and \`latest\` says why (a refused push, a missing repository, a question): report that.
        4. To answer the agent, or to pass on the person's approval to land its pull requests, call Sync Cloud Coding
           Run with the chat and \`prompt\` set to the message, then keep syncing as in step 2. The agent continues in
           the same session. When every pull request has merged, \`merged\` is true and the tasks are done; syncing a
           finished run again re-checks its pull requests, so a merge made later also moves its tasks to done.

        Runs drive themselves. Starting a run gives the space a timer (every five minutes, on EDGE) that runs Drive
        Cloud Coding Runs: it folds the agent's turn, marks tasks done once every pull request has merged, asks the
        agent to fix a failed check (naming it and its URL), and, once landing is approved, asks it to land the pull
        request (up to date, checks green, \`gh pr merge --auto --squash\`). The Agentic Review check is advisory and
        never blocks. The pull request is authored with the person's own GitHub token, so they cannot approve it on
        GitHub: an approving review from anyone, or a \`land\` label on the pull request, is how they approve
        landing. Each follow-up goes out once per pull request and commit. Syncing by hand is optional.

        A run takes minutes to hours. Do not start a second run for the same tasks: tasks an agent holds are skipped.
      `,
    }),
  });
