//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { ScriptedLanguageModel } from '@dxos/ai/testing';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Project from '@dxos/compute/Project';
import * as Skill from '@dxos/compute/Skill';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { DXN } from '@dxos/keys';
import * as AssistantPlugin from '@dxos/plugin-assistant/AssistantPlugin';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as ProjectsPlugin from '@dxos/plugin-projects/ProjectsPlugin';
import * as RoutinePlugin from '@dxos/plugin-routine/RoutinePlugin';
import { translations as routineTranslations } from '@dxos/plugin-routine/translations';
import * as SpacePlugin from '@dxos/plugin-space/SpacePlugin';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import { translations as tasksTranslations } from '@dxos/plugin-tasks/translations';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { type Space, useSpaces } from '@dxos/react-client/echo';
import { AttendableContainer } from '@dxos/react-ui-attention';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { Loading, TestGrid, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';
import { Text } from '@dxos/schema';
import { Milestone, Outline, Task, TaskSet } from '@dxos/types';

import { translations } from '#translations';

import { ProjectArticle } from '../containers/ProjectArticle/ProjectArticle.tsx';
import { ProjectTaskCompanion } from '../containers/ProjectTaskCompanion/ProjectTaskCompanion.tsx';
import * as AgentSimulator from '../testing/AgentSimulator.ts';

//
// Delegation end to end with a simulated agent: the real plugin stack, the real delegation
// operation, session, tools and trace feed, with only the model replaced by `AgentSimulator`.
//

const PROJECT_NAME = 'Coffee launch';
const ATTENDABLE_ID = 'story';

/** The project template: two top-level tasks, each with its sub-tasks, in working order. */
const TEMPLATE: readonly { title: string; subtasks: readonly string[] }[] = [
  {
    title: 'Source the beans',
    subtasks: ['Shortlist three importers', 'Order sample lots', 'Cup the samples', 'Negotiate the first contract'],
  },
  {
    title: 'Design the packaging',
    subtasks: ['Draft the label copy', 'Commission the artwork', 'Print a proof run'],
  },
];

/** The top-level task the play function hands to the agent. */
const DELEGATED_TASK = TEMPLATE[0].title;

// The story's graph, read by the simulator on every model call; the generation guards against a
// previous story's client that finishes initializing late (see ProjectArticle.stories.tsx).
let generation = 0;
let seeded: { generation: number; space: Space; project: Project.Project; roots: Task.Task[] } | undefined;

const createProject = (space: Space, storyGeneration: number) => {
  const project = space.db.add(Project.make({ name: PROJECT_NAME }));
  const taskSet = project.taskSet?.target;
  if (!taskSet) {
    throw new Error('Expected the project to own a task set.');
  }
  const instructions = Instructions.make({ [Obj.Parent]: project, text: 'You are working on a coffee launch.' });
  Obj.update(project, (project) => {
    project.instructions = Ref.make(instructions);
  });

  const roots = TEMPLATE.map(({ title, subtasks }) => {
    const root = TaskSet.addTask(space.db, taskSet, title);
    for (const subtask of subtasks) {
      TaskSet.addTask(space.db, taskSet, subtask, {}, { parent: root });
    }
    return root;
  });

  seeded = { generation: storyGeneration, space, project, roots };
};

const seedContent = async () => {
  await waitFor(() => expect(seeded?.generation).toBe(generation), { timeout: 10_000 });
  const context = seeded;
  if (!context) {
    throw new Error('The story did not create a project.');
  }
  await context.space.db.flush({ indexes: true });
  return context;
};

/** The task the agent holds: resolved lazily, since the model is built before the graph is seeded. */
const delegatedTask = () => seeded?.roots.find((task) => task.title === DELEGATED_TASK);

const MasterDetailStory = () => {
  const [space] = useSpaces();
  const projects = useQuery(space?.db, Filter.type(Project.Project));
  const project = projects.find((entry) => entry.name === PROJECT_NAME);
  if (!space?.db || !project) {
    return <Loading data={{ db: !!space?.db, project: !!project }} />;
  }

  return (
    <TestGrid.Root>
      <TestGrid.Stack layout='2fr_1fr'>
        <TestGrid.Panel>
          <AttendableContainer id={ATTENDABLE_ID} classNames='contents'>
            <ProjectArticle role='article' subject={project} attendableId={ATTENDABLE_ID} />
          </AttendableContainer>
        </TestGrid.Panel>
        <TestGrid.Panel>
          <ProjectTaskCompanion role='article' attendableId={ATTENDABLE_ID} companionTo={project} />
        </TestGrid.Panel>
      </TestGrid.Stack>
    </TestGrid.Root>
  );
};

/** `LayoutOperation.Open` belongs to DeckPlugin, which this story does not install. */
const MockDeckOperationsPlugin = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.projects.story.agentSimulation.mockDeckOperations'),
    name: 'Mock Deck Ops',
  }),
).pipe(
  Plugin.addModule(
    Capability.inlineModule('operation-handler', { provides: [Capabilities.OperationHandler] }, () =>
      Effect.succeed([
        Capability.contribute(
          Capabilities.OperationHandler,
          OperationHandlerSet.make(Operation.withHandler(LayoutOperation.Open, () => Effect.succeed([] as string[]))),
        ),
      ]),
    ),
  ),
  Plugin.make,
);

/**
 * The plugin stack, with the assistant's language model replaced by the simulator. Per story rather
 * than on the meta, since each variant configures its own simulator; the theme is outermost, as in
 * the app, so dialogs the layout portals out still get translations.
 */
const withSimulatedAgent = (options: Omit<AgentSimulator.AgentSimulatorOptions, 'root'> = {}) => [
  withLayout({ layout: 'fullscreen' }),
  withPluginManager({
    plugins: [
      ...corePlugins(),
      TasksPlugin.make(),
      ProjectsPlugin.make(),
      AssistantPlugin.make({
        aiServiceMiddleware: ScriptedLanguageModel.scriptedAiServiceMiddleware(
          AgentSimulator.make({ root: delegatedTask, ...options }),
        ),
      }),
      SpacePlugin.make({}),
      // Provides `RemoteProcessManager`, which the assistant's agent service requires.
      RoutinePlugin.make(),
      ClientPlugin.make({
        types: [
          Project.Project,
          Instructions.Instructions,
          Skill.Skill,
          Text.Text,
          Outline.Outline,
          TaskSet.TaskSet,
          Task.Task,
          Milestone.Milestone,
        ],
        onClientInitialized: ({ client }) =>
          Effect.gen(function* () {
            const storyGeneration = generation;
            const { defaultSpace } = yield* initializeIdentity(client);
            yield* Effect.promise(async () => {
              createProject(defaultSpace, storyGeneration);
              await defaultSpace.db.flush({ indexes: true });
            });
          }),
      }),
      StorybookPlugin.make({}),
      MockDeckOperationsPlugin(),
    ],
  }),
  withTheme(),
];

/** Runs the row's "Assign to agent" action on the task titled `title`. */
const assignToAgent = async (canvas: ReturnType<typeof within>, title: string) => {
  const label = await canvas.findByText(title, undefined, { timeout: 10_000 });
  const row = label.closest('[data-testid="taskList.item"]');
  await expect(row).toBeTruthy();
  await userEvent.click(
    await within(row as HTMLElement).findByTestId('taskList.item.actions', undefined, { timeout: 10_000 }),
  );
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

/** The question the `Question` variant's agent asks, and the option the play function picks. */
const QUESTION: AgentSimulator.Question = {
  task: 'Cup the samples',
  question: 'Which lot should the first contract cover?',
  context: 'Both lots cupped above 86; the budget covers one.',
  options: ['Ethiopia Guji', 'Colombia Huila'],
};

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
  // Held a beat so the blocked task and its question read on screen before they resolve.
  await new Promise((resolve) => setTimeout(resolve, 3_000));
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
    await userEvent.click(await canvas.findByTestId('projectsPlugin.tab.tasks', undefined, { timeout: 10_000 }));
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
    let answered = answer === undefined;
    await waitFor(
      async () => {
        const current = subtasks.find((task) => task.status === 'started');
        if (current && !followed.has(current.id)) {
          followed.add(current.id);
          await selectTask(canvas, current.title);
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

const meta = {
  title: 'plugins/plugin-projects/stories/AgentSimulation',
  render: MasterDetailStory,
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [
      ...translations,
      ...reactUiTranslations,
      ...formTranslations,
      ...routineTranslations,
      ...tasksTranslations,
    ],
  },
  // Paced for a watchable demo (about a minute), which is too slow for the CI story run.
  tags: ['!test'],
  beforeEach: () => {
    seeded = undefined;
    generation += 1;
  },
} satisfies Meta<typeof MasterDetailStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** One sub-task at a time, in order. */
export const Sequential: Story = {
  decorators: withSimulatedAgent(),
  play: makePlay(),
};

/** Every sub-task started at once, then finished one by one. */
export const Concurrent: Story = {
  decorators: withSimulatedAgent({ strategy: AgentSimulator.concurrent }),
  play: makePlay(),
};

/**
 * Sequential, except the agent blocks on a question part-way through a sub-task and ends its turn;
 * answering it from the task's detail pane resumes the agent, which finishes the rest.
 */
export const Question: Story = {
  decorators: withSimulatedAgent({ strategy: AgentSimulator.withQuestion(AgentSimulator.sequential, QUESTION) }),
  play: makePlay({ answer: QUESTION.options[0] }),
};
