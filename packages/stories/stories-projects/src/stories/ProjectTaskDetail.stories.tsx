//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import { Obj, Ref } from '@dxos/echo';
import * as AssistantPlugin from '@dxos/plugin-assistant/AssistantPlugin';
import * as GitHubPlugin from '@dxos/plugin-github/GitHubPlugin';
import { FixtureLinkSourcePlugin } from '@dxos/plugin-github/testing';
import * as MarkdownEvents from '@dxos/plugin-markdown/MarkdownEvents';
import * as PreviewEvents from '@dxos/plugin-preview/PreviewEvents';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import * as ProjectsPlugin from '@dxos/plugin-projects/ProjectsPlugin';
import * as RoutinePlugin from '@dxos/plugin-routine/RoutinePlugin';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import { type Space } from '@dxos/react-client/echo';
import { Text } from '@dxos/schema';
import { Cell, createStoryDecorators } from '@dxos/storybook-testing';
import { Milestone, Outline, Repo, Task, TaskSet } from '@dxos/types';

import { ModuleContainer, TaskDetail, storyParameters } from '../testing/index.ts';

const TASK_TITLE = 'Ship the tasks section';
// Carries both reference forms the markdown surfaces linkify: a bare URL and a `#nnn` issue.
const LINK_TASK_TITLE = 'Follow up on #12752 before the release';
const LINK_TASK_DESCRIPTION =
  'Spec at https://github.com/dxos/dxos/pull/12752 — the preview build is at https://pr-12752-composer-dev.dxos.workers.dev, and it supersedes #12431.';
const TASK_ARTIFACT_TITLE = 'Cupping Sheet';
const TASK_QUESTION = 'Should the tasks section ship enabled by default?';
const TASK_ANSWER = 'On for internal spaces only';
const TASK_OPEN_QUESTION = 'Which spaces count as internal?';

let generation = 0;
let seededGeneration: number | undefined;

const seedProject = async ({ space }: { space: Space }) => {
  const storyGeneration = generation;
  const project = space.db.add(Project.make({ name: 'Project 1' }));
  const taskSet = project.taskSet?.target;
  if (!taskSet) {
    throw new Error('Expected the project to own a task set.');
  }
  // The project names its repository, which is what makes a `#nnn` reference resolve.
  const repo = space.db.add(Repo.make({ name: 'dxos', owner: 'dxos', url: 'https://github.com/dxos/dxos' }));
  const instructions = Instructions.make({
    [Obj.Parent]: project,
    text: 'You are an assistant focused on this project.',
  });
  Obj.update(project, (project) => {
    project.repo = Ref.make(repo);
    project.instructions = Ref.make(instructions);
  });

  const task = TaskSet.addTask(space.db, taskSet, TASK_TITLE);
  // Written by the verbs that write it in the app, so the pair is joined as the pane expects.
  const question = Task.ask(task, {
    text: TASK_QUESTION,
    context: 'The section ships behind a flag either way; the question is what the flag defaults to.',
    options: [{ title: TASK_ANSWER }, { title: 'Off for everyone' }],
    actor: { role: 'assistant', name: 'Scout' },
  });
  Task.answer(task, question.id, TASK_ANSWER, { actor: { role: 'user', name: 'Rich' } });
  Task.ask(task, {
    text: TASK_OPEN_QUESTION,
    context: 'Nobody has said which spaces count as internal, and the flag needs a list.',
    options: [{ title: 'Every space the team owns' }, { title: 'Only the demo space' }],
    actor: { role: 'assistant', name: 'Scout' },
  });
  Task.addArtifact(task, space.db.add(Text.make({ name: TASK_ARTIFACT_TITLE, content: 'Cupping sheet.' })));
  TaskSet.addTask(space.db, taskSet, LINK_TASK_TITLE, { description: LINK_TASK_DESCRIPTION });

  await space.db.flush({ indexes: true });
  seededGeneration = storyGeneration;
  return [[Cell.article(project)], [Cell.article(project, { component: TaskDetail })]];
};

/** Resolves the element `query` finds, failing the play function when it is absent. */
const required = (element: HTMLElement | null, name: string): HTMLElement => {
  if (!element) {
    throw new Error(`Expected ${name}.`);
  }
  return element;
};

const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-projects/ProjectTaskDetail',
  render: ModuleContainer,
  parameters: storyParameters,
  args: { columns: '3fr_2fr' },
  decorators: createStoryDecorators({
    types: [
      Project.Project,
      Instructions.Instructions,
      Text.Text,
      Outline.Outline,
      TaskSet.TaskSet,
      Task.Task,
      Milestone.Milestone,
      Repo.Repo,
    ],
    onInit: seedProject,
    // Both start events at setup, so the markdown extensions and the link resolver are live before
    // the first render.
    setupEvents: [MarkdownEvents.Start, PreviewEvents.Start],
    plugins: [
      SpacePlugin({}),
      TasksPlugin.make(),
      ProjectsPlugin.make(),
      AssistantPlugin.make(),
      RoutinePlugin.make(),
      // The `#123` decoration, link chips and the hover-card resolver; the fixture source answers
      // the resolver without the network.
      GitHubPlugin.make(),
      PreviewPlugin.make(),
      FixtureLinkSourcePlugin(),
    ],
  }),
  beforeEach: () => {
    seededGeneration = undefined;
    generation += 1;
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Master-detail: the ledger on the left, the selected task's article on the right — what the deck
 * shows as two planks once a row is clicked.
 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(seededGeneration).toBe(generation), { timeout: 30_000 });
    await userEvent.click(await canvas.findByTestId('projectsPlugin.tab.tasks', undefined, { timeout: 30_000 }));
    await userEvent.click(await canvas.findByText(TASK_TITLE, undefined, { timeout: 10_000 }));
    // The detail panel renders the same title as an editable field, so the form is what is asserted
    // rather than a second copy of the row's text.
    await expect(canvas.findByDisplayValue(TASK_TITLE, undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    // Scoped to the grid rather than the canvas: the ledger row carries a chip with the same text.
    const cards = () => canvasElement.querySelector<HTMLElement>('[data-testid="cardMasonry"]');
    await waitFor(() => expect(cards()).toBeTruthy(), { timeout: 10_000 });
    await expect(canvasElement.querySelectorAll('[data-testid="cardMasonry"]')).toHaveLength(1);
    // The answered exchange reads as two lines of the log, with no controls.
    const history = () => canvasElement.querySelector<HTMLElement>('[data-testid="taskList.history"]');
    await waitFor(() => expect(history()).toBeTruthy(), { timeout: 10_000 });
    const log = within(required(history(), 'the task history'));
    await expect(log.findByText(TASK_QUESTION, undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    await expect(log.findByText(TASK_ANSWER, undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    // The open one is a prompt: its text, the options it suggests, and a field for another answer.
    const prompt = () => canvasElement.querySelector<HTMLElement>('[data-testid="task-question"]:has(input)');
    await waitFor(() => expect(prompt()).toBeTruthy(), { timeout: 10_000 });
    const open = within(required(prompt(), 'the open question'));
    await expect(open.findByText(TASK_OPEN_QUESTION, undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    await expect(open.findAllByTestId('task-question.option')).resolves.toHaveLength(2);
    // The answered one stays a record: exactly one prompt, not two.
    await expect(canvasElement.querySelectorAll('[data-testid="task-question.input"]')).toHaveLength(1);
    // The card names the artifact in its header and again in its body form.
    await expect(
      within(required(cards(), 'the artifact grid')).findAllByText(TASK_ARTIFACT_TITLE, undefined, { timeout: 10_000 }),
    ).resolves.not.toHaveLength(0);

    // The description is edited with the host's contributed extensions live in it: a task opened in
    // the pane decorates `#123` and a pull-request URL rather than showing raw markdown.
    await userEvent.click(await canvas.findByText(LINK_TASK_TITLE, undefined, { timeout: 10_000 }));
    const editor = () => canvasElement.querySelector<HTMLElement>('[data-testid="taskEditor.description"]');
    await waitFor(async () => await expect(editor()?.textContent).toContain('supersedes'), { timeout: 10_000 });
    await waitFor(
      async () =>
        await expect(
          [...(editor()?.querySelectorAll('a.cm-link') ?? [])].map((link) => link.getAttribute('href')),
        ).toContain('https://github.com/dxos/dxos/issues/12431'),
      { timeout: 10_000 },
    );
    await waitFor(
      async () =>
        await expect(
          [...(editor()?.querySelectorAll('.dx-tag--anchor') ?? [])].map((chip) => chip.textContent),
        ).toContain('#12752'),
      { timeout: 10_000 },
    );
  },
};
