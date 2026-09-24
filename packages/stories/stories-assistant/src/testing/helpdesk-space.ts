//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import { Feed, Obj } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { scaffoldProject } from '@dxos/plugin-projects/templates';
import { Outline, Task, TaskSet } from '@dxos/types';
import { trim } from '@dxos/util';

export const HELPDESK_SPACE_ID = 'com.example.space.helpdesk';

/**
 * No mention of questions: the point of the fixture is that the planning skill's own instructions
 * are enough to make an agent ask rather than guess. An instruction to "ask when unsure" here would
 * test the fixture instead.
 */
const PROJECT_INSTRUCTIONS = trim`
  You are the assistant for the "Helpdesk" project.
  Work the project's checklist. Never invent a fact about the customer's environment — the details
  are held by the person you are working for, not by you.
`;

/**
 * Tasks written so the first one cannot be completed from what is in the space.
 *
 * The refund window and the tone of the reply are decisions, not lookups: nothing in the project
 * states either, so an agent that does not ask has to fabricate one. That is exactly the behaviour
 * the ask-question tool exists to replace, which makes this the shortest fixture that exercises the
 * whole loop — ask, block, answer, resume — without a script telling it to.
 */
const TASKS: { title: string; description: string }[] = [
  {
    title: 'Draft the refund reply to Acme',
    description: trim`
      Acme asked for a refund on order #4471, placed 45 days ago. Our published refund window is not
      recorded anywhere in this project, and neither is whether we make exceptions for enterprise
      accounts — nobody has written either down, so there is nothing here to look them up in.
      Done means: the reply to Acme is drafted in this conversation, and it states the decision that
      actually applies. Do not invent the policy.
    `,
  },
  {
    title: 'File the outcome in the account notes',
    description: 'Record what we told Acme and why, once the reply above is settled.',
  },
];

/**
 * Space template for the question loop: a project whose first task is deliberately undecidable from
 * the space alone, so the agent must ask the reader and resume on the answer.
 */
export const helpdeskSpace: AppCapabilities.SpaceTemplate = {
  id: HELPDESK_SPACE_ID,
  label: 'Helpdesk',
  description: 'A project whose first task cannot be finished without asking the user a question.',
  icon: 'ph--lifebuoy--regular',
  apply: async ({ client, space }) => {
    await client.addTypes([
      Project.Project,
      Instructions.Instructions,
      TaskSet.TaskSet,
      Task.Task,
      Outline.Outline,
      Feed.Feed,
    ]);
    const project = space.db.add(
      scaffoldProject({
        name: 'Helpdesk',
        description: 'Customer support work-stream.',
        text: PROJECT_INSTRUCTIONS,
      }),
    );
    // Resolved off the project rather than built here: `Project.make` already owns a ledger, and a
    // second one would leave the tasks in a set the project's own UI never shows.
    const taskSet = await project.taskSet?.tryLoad();
    if (taskSet) {
      for (const { title, description } of TASKS) {
        TaskSet.addTask(space.db, taskSet, title, { description });
      }
      // Parent edge stamped after the writes above so the whole ledger lands in one cascade.
      Obj.setParent(taskSet, project);
    }
    await space.db.flush({ indexes: true });
  },
};

/** Contributes {@link helpdeskSpace} alongside the story's other space templates. */
const HelpdeskSpacePluginBuilder = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('com.example.plugin.helpdeskSpace'),
    name: 'Helpdesk Space',
  }),
).pipe(
  Plugin.addModule({
    id: 'com.example.plugin.helpdeskSpace.module.template',
    provides: [AppCapabilities.SpaceTemplate],
    activate: () => Effect.succeed([Capability.contribute(AppCapabilities.SpaceTemplate, helpdeskSpace)]),
  }),
);

export const HelpdeskSpacePlugin = Plugin.make(HelpdeskSpacePluginBuilder)();
