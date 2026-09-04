//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Obj, Ref } from '@dxos/echo';
import { Actor, Task, TaskSet } from '@dxos/types';

import { daysAgo } from './util';

//
// The plan, authored as a tree.
//
// `TaskSet.tasks` is flat — the hierarchy lives on `Task.parentTask`, at unbounded depth. So the
// seeds are nested for legibility and flattened on the way in, which keeps the shape of the work
// visible in the source rather than reconstructable only by following refs.
//
// Everything is `todo`: this is a plan to run, not a project caught mid-flight. The one thing the
// seeds do assert is ORDER — a stage assumes the one before it landed, so each depends on its
// predecessor and a runner that skips ahead is visibly out of order rather than merely early.
//

type TaskSeed = {
  readonly title: string;
  readonly description?: string;
  readonly estimate?: Task.Estimate;
  /** Set where the step needs the reader's own hands — a consent screen, or a repository to own. */
  readonly assignee?: Actor.Actor;
  readonly subTasks?: ReadonlyArray<TaskSeed>;
};

/**
 * The reader, as an assignee. A template cannot know who they are, so the actor carries the role and
 * a label rather than a Person ref — enough for the row to say the step is not the agent's.
 */
const USER: Actor.Actor = { role: 'user', name: 'You' };

const PLAN: TaskSeed = {
  title: 'Ship a coding chatroom app on Cloudflare Workers',
  description:
    'From the brief to a URL two browser tabs can talk through. Each stage below deploys before the next one starts.',
  estimate: 'l',
  subTasks: [
    {
      title: 'Design the app and write it down',
      description: 'A Markdown artifact on this project, with the diagrams a reviewer reads instead of the code.',
      estimate: 's',
      subTasks: [
        {
          title: 'Diagram the request path',
          description: 'Browser → Worker → Durable Object, as a mermaid flowchart. Name what routes by room id.',
          estimate: 'xs',
        },
        {
          title: 'Diagram the room lifecycle',
          description: 'Join, post, fan-out and eviction, as a mermaid sequence diagram across two clients.',
          estimate: 'xs',
        },
        {
          title: 'State what the Durable Object holds, and what it loses on eviction',
          estimate: 'xs',
        },
        {
          title: 'File the design as a project artifact',
          description: 'DESIGN.md, added to the project rather than left in the chat.',
          estimate: 'xs',
        },
      ],
    },
    {
      title: 'Satisfy the prerequisites',
      description:
        "The repository and both credentials are the reader's to create; the agent is the only part that can be delegated. In this order — the token is scoped to a repository that has to exist first.",
      estimate: 'm',
      subTasks: [
        {
          title: 'Create an empty GitHub repository for the app',
          description:
            'Yours to do: a connector token authorises access to repositories, it cannot create one. Make it empty — the scaffold stage pushes the first commit — and note the owner/name.',
          estimate: 'xs',
          assignee: USER,
        },
        {
          title: 'Connect the GitHub credential, scoped to that repository',
          description:
            'On the authorisation screen choose "Only select repositories" and pick the one above, with Contents and Pull requests set to read and write. A token scoped to everything is a token the agent did not need.',
          estimate: 'xs',
          assignee: USER,
        },
        {
          title: 'Connect the Anthropic credential',
          description: 'Every managed-agent step calls Anthropic; without it they fail with MissingCredentialError.',
          estimate: 'xs',
          assignee: USER,
        },
        {
          title: 'Create and deploy a Claude managed agent',
          description: 'Two steps: creating writes the configuration, deploying is what a session actually runs.',
          estimate: 's',
        },
        {
          title: 'Bind the GitHub token to the session as GH_TOKEN',
          description:
            'An agent has no GitHub access of its own. The token rotates, so refresh it rather than restarting a session that starts getting 401s.',
          estimate: 'xs',
        },
      ],
    },
    {
      title: 'Scaffold a Worker and prove it deploys',
      description: 'Nothing application-shaped in this stage. The point is a URL that answers before code exists.',
      estimate: 'm',
      subTasks: [
        { title: 'Initialize the project with wrangler', estimate: 'xs' },
        {
          title: 'Return a plain response from the fetch handler',
          description: 'One line of body. Anything more is the next stage.',
          estimate: 'xs',
        },
        {
          title: "Deploy with wrangler's unauthenticated mode",
          description: 'Record what it prints, including the URL it hands back.',
          estimate: 's',
        },
        {
          title: 'Fetch the deployed URL and confirm the body',
          description: 'Fetch it. A successful deploy command is not evidence that anything is serving.',
          estimate: 'xs',
        },
      ],
    },
    {
      title: 'Add the backend: one Durable Object per room',
      description: 'Room state and fan-out, redeployed and checked at the end of the stage.',
      estimate: 'l',
      subTasks: [
        {
          title: 'Declare the Durable Object binding and its migration',
          description: 'A missing migration is the usual reason a first DO deploy is rejected.',
          estimate: 's',
        },
        {
          title: 'Route /room/:id to a Durable Object instance by name',
          description: 'Same room id, same instance — that is the whole routing rule.',
          estimate: 's',
        },
        {
          title: 'Hold the member list and the recent messages in DO state',
          estimate: 'm',
        },
        {
          title: 'Accept a WebSocket and fan out messages to the room',
          estimate: 'm',
        },
        {
          title: 'Redeploy and confirm two connections see each other',
          description: 'Two WebSocket clients against the deployed URL, not a local dev server.',
          estimate: 's',
        },
      ],
    },
    {
      title: 'Add a chatroom UI',
      description: 'One page, served by the same Worker, with no build step.',
      estimate: 'm',
      subTasks: [
        { title: 'Serve a single HTML page from the Worker', estimate: 's' },
        {
          title: 'Connect to the room WebSocket and render the backlog',
          estimate: 's',
        },
        {
          title: 'Send on Enter, and show who is in the room',
          estimate: 's',
        },
        {
          title: 'Deploy and open the same room in two tabs',
          description: "The brief's definition of done. Screenshot it.",
          estimate: 'xs',
        },
      ],
    },
  ],
};

export type TasksResult = {
  taskSet: TaskSet.TaskSet;
  tasks: Task.Task[];
  root: Task.Task;
  /** The five stages, in order — the level the dependency chain is written across. */
  stages: Task.Task[];
};

/**
 * Depth-first flatten, resolving each seed against its parent.
 *
 * The stages are collected on the way down rather than recovered afterwards by comparing
 * `parentTask` refs: a ref's target is not comparable until the database has flushed.
 */
const buildTasks = (seed: TaskSeed): { tasks: Task.Task[]; stages: Task.Task[] } => {
  const tasks: Task.Task[] = [];
  const stages: Task.Task[] = [];
  const visit = (seed: TaskSeed, parent: Task.Task | undefined) => {
    const task = Task.make({
      title: seed.title,
      status: 'todo',
      description: seed.description,
      estimate: seed.estimate,
      assignee: seed.assignee,
      parentTask: parent ? Ref.make(parent) : undefined,
      // Task carries no due date; its dates are activity-log lines, so that is where they go.
      history: [{ date: daysAgo(0), event: 'created' as const, description: 'Filed from the chatroom template.' }],
    });
    tasks.push(task);
    if (parent !== undefined && parent === tasks[0]) {
      stages.push(task);
    }
    for (const child of seed.subTasks ?? []) {
      visit(child, task);
    }
  };

  visit(seed, undefined);
  return { tasks, stages };
};

/** The plan: one root task, five stages under it, and the steps under those. */
export const Tasks: SampleSpace.Phase<TasksResult> = SampleSpace.phase('tasks', {
  schemas: [TaskSet.TaskSet, Task.Task],
  run: () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(
        TaskSet.make({
          name: 'Chatroom on Workers',
          description: 'Everything between the brief and two tabs talking to each other.',
        }),
      );

      const { tasks, stages } = buildTasks(PLAN);
      yield* SampleSpace.children(taskSet, tasks, (taskSet, refs) => {
        taskSet.tasks = refs;
      });

      // Each stage depends on the one before it: the stages are sequential by construction (a
      // Durable Object cannot be deployed by a Worker that has never deployed), and stating it is
      // what makes a runner working out of order visible rather than merely early.
      for (const [index, stage] of stages.entries()) {
        if (index > 0) {
          const previous = stages[index - 1];
          Obj.update(stage, (stage) => {
            stage.dependsOn = [Ref.make(previous)];
          });
        }
      }

      return { taskSet, tasks, root: tasks[0], stages };
    }),
});
