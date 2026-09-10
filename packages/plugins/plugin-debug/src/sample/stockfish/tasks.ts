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
// The ordering constraint that shaped the stages: nothing needing an account outside this space
// happens until the app already works. Publishing is stage five for exactly that reason — a consent
// screen in the middle of the build is where a first run stops.
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
  title: 'Ship a chess engine as an MCP server on Cloudflare Workers',
  description:
    'From the brief to a tool a chat in this space calls. Each stage below deploys and is verified before the next one starts.',
  estimate: 'l',
  subTasks: [
    {
      title: 'Design the tool surface and write it down',
      description: 'A Markdown artifact on this project, with the diagrams a reviewer reads instead of the code.',
      estimate: 's',
      subTasks: [
        {
          title: 'Select DeepSeek V4 Pro as the chat model',
          description:
            'Yours to do: the model is a Composer setting, not something this space can carry. Assistant settings → model, or the selector in the chat itself. It runs through the DXOS edge, so no Anthropic key is involved anywhere in this project.',
          estimate: 'xs',
          assignee: USER,
        },
        {
          title: 'Name the two tools and pin their schemas',
          description:
            'Evaluate a position, and name the best move from one. FEN in, and a bounded search budget as an argument — decide the unit and the ceiling now.',
          estimate: 'xs',
        },
        {
          title: 'Diagram the request path',
          description: 'Chat → MCP client → Worker → engine, as a mermaid flowchart. Name what is bundled and what is fetched.',
          estimate: 'xs',
        },
        {
          title: 'Decide how the engine gets into the Worker',
          description:
            'A WebAssembly build bundled with the Worker, and what that costs against the bundle-size limit. State the fallback if it does not fit.',
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
      title: 'Deploy an empty Worker with no Cloudflare account',
      description:
        'Nothing application-shaped in this stage. The point is a URL that answers before any code exists, and an account claimed while it is cheap to lose.',
      estimate: 'm',
      subTasks: [
        {
          title: 'Create the sandbox and install the toolchain',
          description:
            'One sandbox for the whole project — it keeps its filesystem between commands, so a second one pays for node and wrangler again.',
          estimate: 's',
        },
        {
          title: 'Initialize the project with wrangler',
          description: 'A TypeScript Worker returning one line of body. Anything more is a later stage.',
          estimate: 'xs',
        },
        {
          title: 'Deploy without authenticating to Cloudflare',
          description:
            'Wrangler deploys with no account by minting a temporary one. Record both URLs it prints — the Worker URL, and the claim URL — and claim it before going further: the temporary account expires, and every later stage redeploys this Worker.',
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
      title: 'Implement the MCP server and the engine',
      description: 'The application stage, redeployed and checked over the wire at the end of it.',
      estimate: 'l',
      subTasks: [
        {
          title: 'Answer the MCP handshake over Streamable HTTP',
          description:
            'Initialize and `tools/list` on one endpoint, with the two tools advertised and nothing behind them yet.',
          estimate: 'm',
        },
        {
          title: 'Bundle the engine and run one search',
          description: 'Prove a search returns inside the budget the design set, from a Worker rather than from node.',
          estimate: 'm',
        },
        {
          title: 'Implement both tools over the engine',
          description: 'Reject an unparseable FEN as a tool error rather than letting the engine fail on it.',
          estimate: 'm',
        },
        {
          title: 'Redeploy and call `tools/list` and both tools over the wire',
          description:
            'Against the deployed URL, not a local dev server. Paste the responses into the project — that is the stage evidence.',
          estimate: 's',
        },
      ],
    },
    {
      title: 'Register the server and use it from the chess chat',
      description: "The brief's definition of done, and the first point at which the thing is worth showing anyone.",
      estimate: 'm',
      subTasks: [
        {
          title: 'Add the deployed URL as an MCP server in this space',
          description:
            'Protocol `http` — Streamable HTTP, not the deprecated SSE transport. Its key is stored in plaintext and replicates to everyone in the space, so keep it to one the Worker can rotate.',
          estimate: 's',
        },
        {
          title: 'Confirm the tools reach the chat',
          description:
            'A chat that lists the two tools has connected; one that does not is a transport or URL fault, not a model that chose against them.',
          estimate: 'xs',
        },
        {
          title: 'Ask for the best move in the seeded game',
          description:
            'Open the game and ask. The answer has to arrive as a tool call in the transcript — a plausible move the model knew already is a failure of this step, not a pass.',
          estimate: 's',
        },
      ],
    },
    {
      title: 'Publish it to GitHub',
      description:
        'Last on purpose: the two consent screens below are the only steps that leave this space, and putting them here means a first run reaches a working engine before it meets one.',
      estimate: 'm',
      subTasks: [
        {
          title: 'Create an empty GitHub repository for the server',
          description:
            'Yours to do: a connector token authorises access to repositories, it cannot create one. Make it empty — this stage pushes the first commit — and note the owner/name.',
          estimate: 'xs',
          assignee: USER,
        },
        {
          title: 'Connect the GitHub credential, scoped to that repository',
          description:
            'On the authorisation screen choose "Only select repositories" and pick the one above, with Contents set to read and write. A token scoped to everything is a token the agent did not need.',
          estimate: 'xs',
          assignee: USER,
        },
        {
          title: 'Push the tree, with the deploy and MCP steps written down',
          description:
            'A README that gets a reader from a clone to a registered MCP server. The wrangler invocation and the URL to register are the two things they cannot guess.',
          estimate: 's',
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
      history: [{ date: daysAgo(0), event: 'created' as const, description: 'Filed from the chess MCP template.' }],
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
          name: 'Chess MCP on Workers',
          description: 'Everything between the brief and a chat asking the engine for a move.',
        }),
      );

      const { tasks, stages } = buildTasks(PLAN);
      yield* SampleSpace.children(taskSet, tasks, (taskSet, refs) => {
        taskSet.tasks = refs;
      });

      // Each stage depends on the one before it: the stages are sequential by construction (an MCP
      // server cannot be registered before it has a URL), and stating it is what makes a runner
      // working out of order visible rather than merely early.
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
