//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import { Obj, Ref } from '@dxos/echo';
import * as AssistantPlugin from '@dxos/plugin-assistant/AssistantPlugin';
import * as ProjectsPlugin from '@dxos/plugin-projects/ProjectsPlugin';
import * as ProjectView from '@dxos/plugin-projects/ProjectView';
import { AgentSimulator } from '@dxos/plugin-projects/testing';
import * as RoutinePlugin from '@dxos/plugin-routine/RoutinePlugin';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import { type Space } from '@dxos/react-client/echo';
import { Text } from '@dxos/schema';
import { Cell, UpdateCompanionStubPlugin, createStoryDecorators } from '@dxos/storybook-testing';
import { Task, TaskSet } from '@dxos/types';

import { ModuleContainer, storyParameters } from '../testing/index.ts';

//
// Delegation end to end with a simulated agent: the real plugin stack, the real delegation
// operation, session, tools and trace feed, with only the model replaced by `AgentSimulator`.
//

const PROJECT_NAME = 'Coffee launch';

type TemplateTask = { title: string; description: string };

/** The project template: two top-level tasks, each with its sub-tasks, in working order. */
const TEMPLATE: readonly (TemplateTask & { subtasks: readonly TemplateTask[] })[] = [
  {
    title: 'Source the beans',
    description: 'Find a green-coffee supplier for the launch roast and lock in the first contract.',
    subtasks: [
      {
        title: 'Shortlist three importers',
        description: 'Compare importers on origin range, minimum order and lead time; keep the best three.',
      },
      {
        title: 'Order sample lots',
        description: 'Request 1kg samples of two candidate lots from each shortlisted importer.',
      },
      {
        title: 'Cup the samples',
        description: 'Roast and cup every sample to SCA protocol and score them side by side.',
      },
      {
        title: 'Negotiate the first contract',
        description: 'Agree price, volume and delivery schedule for the chosen lot.',
      },
    ],
  },
  {
    title: 'Design the packaging',
    description: 'Produce retail bags that carry the brand and the tasting notes of the launch roast.',
    subtasks: [
      {
        title: 'Draft the label copy',
        description: 'Write the origin story, tasting notes and brewing guide for the back label.',
      },
      {
        title: 'Commission the artwork',
        description: 'Brief an illustrator on the front panel and agree two rounds of revisions.',
      },
      {
        title: 'Print a proof run',
        description: 'Print fifty bags to check colour, fold and valve placement before the full run.',
      },
    ],
  },
];

/** The top-level task the play function hands to the agent. */
const DELEGATED_TASK = TEMPLATE[0].title;

/** The question the `Question` variant's agent asks, and the option the play function picks. */
const QUESTION: AgentSimulator.Question = {
  task: 'Cup the samples',
  question: 'Which lot should the first contract cover?',
  context: 'Both lots cupped above 86; the budget covers one.',
  options: ['Ethiopia Guji', 'Colombia Huila'],
};

// The story's graph, read by the simulator on every model call; the generation guards against a
// previous story's client that finishes initializing late.
let generation = 0;
let seeded: { generation: number; space: Space; roots: Task.Task[] } | undefined;

/** The task the agent holds: resolved lazily, since the model is built before the graph is seeded. */
const delegatedTask = () => seeded?.roots.find((task) => task.title === DELEGATED_TASK);

/** Seeds the project and lays it out as the deck would: the project, and its task companion beside it. */
const seedProject = async ({ space }: { space: Space }) => {
  const storyGeneration = generation;
  const project = space.db.add(Project.make({ name: PROJECT_NAME }));
  const taskSet = project.taskSet?.target;
  if (!taskSet) {
    throw new Error('Expected the project to own a task set.');
  }
  // Opens on the Tasks tab, as the project's persisted view state would after an earlier visit, so the
  // article does not flash Overview before the play function reaches the ledger. Written straight to
  // the view-state store's `local` backend, before the article first reads it.
  const view: ProjectView.State = { tab: 'tasks', pipeline: false };
  window.localStorage.setItem(`dxos:view-state:${ProjectView.aspect.key}:${project.id}`, JSON.stringify(view));
  const instructions = Instructions.make({ [Obj.Parent]: project, text: 'You are working on a coffee launch.' });
  Obj.update(project, (project) => {
    project.instructions = Ref.make(instructions);
  });
  const roots = TEMPLATE.map(({ title, description, subtasks }) => {
    const root = TaskSet.addTask(space.db, taskSet, title, { description });
    for (const subtask of subtasks) {
      TaskSet.addTask(space.db, taskSet, subtask.title, { description: subtask.description }, { parent: root });
    }
    return root;
  });
  await space.db.flush({ indexes: true });
  seeded = { generation: storyGeneration, space, roots };
  return [[Cell.article(project)], [Cell.companion(project, 'task')]];
};

/** The plugin stack, with the assistant's language model replaced by the simulator. */
const createDecorators = (options: Omit<AgentSimulator.AgentSimulatorOptions, 'root'> = {}) =>
  createStoryDecorators({
    types: [Project.Project, Instructions.Instructions, Text.Text, TaskSet.TaskSet, Task.Task],
    onInit: seedProject,
    plugins: [
      SpacePlugin({}),
      TasksPlugin.make(),
      ProjectsPlugin.make(),
      AssistantPlugin.make({ aiServiceMiddleware: AgentSimulator.middleware({ root: delegatedTask, ...options }) }),
      // Provides `RemoteProcessManager`, which the assistant's agent service requires.
      RoutinePlugin.make(),
      // Selecting a row asks the deck to show its companion; the layout here already does.
      UpdateCompanionStubPlugin(),
    ],
  });

const seedContent = async () => {
  await waitFor(() => expect(seeded?.generation).toBe(generation), { timeout: 30_000 });
  const context = seeded;
  if (!context) {
    throw new Error('The story did not create a project.');
  }
  return context;
};

/** Runs the row's "Assign to agent" action on the task titled `title`. */
const assignToAgent = async (canvas: ReturnType<typeof within>, title: string) => {
  const label = await canvas.findByText(title, undefined, { timeout: 10_000 });
  const row = label.closest('[data-testid="taskList.item"]');
  if (!(row instanceof HTMLElement)) {
    throw new Error(`No task row titled "${title}".`);
  }
  await userEvent.click(await within(row).findByTestId('taskList.item.actions', undefined, { timeout: 10_000 }));
  await userEvent.click(await screen.findByText('Assign to agent', undefined, { timeout: 10_000 }));
};

/** Opens the task's detail in the companion, so its history is on screen while the agent works it. */
const selectTask = async (canvas: ReturnType<typeof within>, title: string) => {
  const labels = await canvas.findAllByText(title, undefined, { timeout: 10_000 });
  const label = labels.find((candidate: HTMLElement) => candidate.closest('[data-testid="taskList.item"]'));
  if (label) {
    await userEvent.click(label);
  }
};

/** How long the question stays open before the play function answers it. */
const ANSWER_DELAY = 8_000;

/** Clicks `answer` on the open question the detail pane shows, once it is on screen. */
const answerQuestion = async (canvasElement: HTMLElement, answer: string): Promise<boolean> => {
  const prompt = canvasElement.querySelector<HTMLElement>('[data-testid="task-question"]:has(input)');
  if (!prompt) {
    return false;
  }
  const option = within(prompt)
    .queryAllByTestId('task-question.option')
    .find((candidate) => candidate.textContent?.includes(answer));
  if (!option) {
    return false;
  }
  // Held so the blocked task and its question read on screen, as a person would take a while to answer.
  await new Promise((resolve) => setTimeout(resolve, ANSWER_DELAY));
  await userEvent.click(option);
  return true;
};

/**
 * Assigns the first top-level task to the agent, then follows it: each sub-task is opened in the
 * detail pane as the agent starts it, until every sub-task is done and the delegated task is back
 * with its reviewer. With `answer`, the question the agent blocks on is answered from that pane.
 */
const makePlay =
  ({ answer }: { answer?: string } = {}): Story['play'] =>
  async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await seedContent();
    await userEvent.click(await canvas.findByTestId('projectsPlugin.tab.tasks', undefined, { timeout: 30_000 }));
    await assignToAgent(canvas, DELEGATED_TASK);

    // The ledger opens its pipeline chart when a delegation starts.
    await expect(
      canvas.findByTestId('projectsPlugin.pipeline.chart', undefined, { timeout: 20_000 }),
    ).resolves.toBeTruthy();

    const root = delegatedTask();
    if (!root) {
      throw new Error('Expected the delegated task.');
    }
    const subtasks = (root.subtasks ?? []).flatMap((ref) => (ref.target ? [ref.target] : []));
    const followed = new Set<string>();
    let selected: string | undefined;
    let answered = answer === undefined;
    await waitFor(
      async () => {
        // A task blocked on the question comes first, since the pane is where it is answered; otherwise
        // each sub-task is shown once, as it starts — with several under way, the newest.
        const blocked = answered ? undefined : subtasks.find((task) => task.status === 'blocked');
        const next = blocked ?? subtasks.find((task) => task.status === 'started' && !followed.has(task.id));
        if (next && next.id !== selected) {
          followed.add(next.id);
          selected = next.id;
          await selectTask(canvas, next.title);
        }
        if (!answered && answer !== undefined) {
          answered = await answerQuestion(canvasElement, answer);
        }
        await expect(subtasks.every(AgentSimulator.isFinished) && AgentSimulator.isFinished(root)).toBe(true);
      },
      { timeout: 180_000, interval: 500 },
    );

    // Every sub-task's history records the agent starting and finishing it.
    for (const task of subtasks) {
      const log = (task.history ?? []).flatMap((entry) => (Task.isChangeEntry(entry) ? [entry.description ?? ''] : []));
      await expect(log.some((line) => /started/i.test(line))).toBe(true);
      await expect(log.some((line) => /done/i.test(line))).toBe(true);
    }
    // The exchange stays in the blocked task's history: the question and the answer it resumed on.
    if (answer !== undefined) {
      const blocked = subtasks.find((task) => task.title === QUESTION.task);
      await expect(Task.getQuestions(blocked?.history).map(({ answer }) => answer?.answer)).toEqual([answer]);
    }
  };

const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-projects/AgentSimulation',
  render: ModuleContainer,
  parameters: storyParameters,
  args: { columns: '2fr_1fr' },
  // Paced for a watchable demo (about a minute), which is too slow for the CI story run.
  tags: ['!test'],
  beforeEach: () => {
    seeded = undefined;
    generation += 1;
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

/** One sub-task at a time, in order. */
export const Sequential: Story = {
  decorators: createDecorators(),
  play: makePlay(),
};

/** Sub-tasks started one after another so they overlap, then finished one by one. */
export const Concurrent: Story = {
  decorators: createDecorators({ strategy: AgentSimulator.concurrent }),
  play: makePlay(),
};

/**
 * Concurrent, except the agent blocks on a question part-way through a sub-task and ends its turn;
 * answering it from the task's detail pane resumes the agent, which finishes the rest.
 */
export const Question: Story = {
  decorators: createDecorators({ strategy: AgentSimulator.withQuestion(AgentSimulator.concurrent, QUESTION) }),
  play: makePlay({ answer: QUESTION.options[0] }),
};
