//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import * as Skill from '@dxos/compute/Skill';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { translations as routineTranslations } from '@dxos/plugin-routine/translations';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import { translations as tasksTranslations } from '@dxos/plugin-tasks/translations';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { type Space, useSpaces } from '@dxos/react-client/echo';
import { AttendableContainer } from '@dxos/react-ui-attention';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';
import { Text } from '@dxos/schema';
import { Milestone, Outline, Task, TaskSet } from '@dxos/types';

import { translations } from '#translations';

import { ProjectArticle } from './ProjectArticle';

const PROJECT_NAME = 'Project 1';
const TASK_TITLE = 'Ship the tasks section';
const ARTIFACT_TITLE = 'Design Notes';
const MILESTONE_NAME = 'Beta';
const OUTLINE_ITEM = 'Draft the launch checklist';

/**
 * The seeded graph, kept so a play function can mutate the source objects and assert the article
 * re-renders. The article is fed a live subject by the surface, so proving that a change to a
 * *referenced* object (a task's title, a new member of `taskSet.tasks`, a new artifact ref) reaches
 * the DOM is the only way to catch a section that resolved once and then went inert.
 */
let seeded: { space: Space; project: Project.Project; taskSet: TaskSet.TaskSet } | undefined;

/** A project exactly as `Project.make` leaves it: an owned task set and outline, nothing else. */
const createProject = (space: Space) => {
  const project = space.db.add(Project.make({ name: PROJECT_NAME }));
  const taskSet = project.taskSet?.target;
  if (!taskSet) {
    throw new Error('Expected the project to own a task set.');
  }
  seeded = { space, project, taskSet };
};

/**
 * Fills the default project with the graph the create-object capability builds: an owned
 * Instructions document, checklist content on the owned outline, one referenced artifact, and a
 * task in the owned set. Only the stories that assert on content call this — the default story
 * shows an empty project.
 */
const seedContent = async () => {
  // Called from `play`, which runs once the story has mounted but not necessarily once the client
  // has finished initializing — the project is created by the plugin's `onClientInitialized`.
  await waitFor(() => expect(seeded).toBeTruthy(), { timeout: 10_000 });
  const context = seeded;
  if (!context) {
    throw new Error('The story did not create a project.');
  }
  const { space, project, taskSet } = context;

  const instructions = Instructions.make({ text: 'You are an assistant focused on this project.' });
  const artifact = space.db.add(Text.make({ name: ARTIFACT_TITLE, content: 'Notes.' }));
  Obj.update(project, (project) => {
    project.instructions = Ref.make(instructions);
    project.artifacts = [Ref.make(artifact)];
  });
  Obj.setParent(instructions, project);

  const outline = project.outline?.target;
  if (!outline?.content.target) {
    throw new Error('Expected the project to own an outline.');
  }
  const task = space.db.add(Task.make({ title: TASK_TITLE, status: 'todo' }));
  Obj.setParent(task, taskSet);
  Obj.update(taskSet, (taskSet) => {
    taskSet.tasks = [Ref.make(task)];
  });

  // The third item is what promotion leaves behind: a link to the task in the project's set.
  Obj.update(outline.content.target, (text) => {
    text.content = `- [ ] ${OUTLINE_ITEM}\n- [ ] Book the launch review\n- [ ] [${TASK_TITLE}](${Obj.getURI(task)})\n`;
  });

  await space.db.flush({ indexes: true });
  return context;
};

/** Adds a task to the set the way the verbs do — array membership plus the lifecycle parent edge. */
const addTask = (space: Space, taskSet: TaskSet.TaskSet, title: string, milestone?: Milestone.Milestone) => {
  const task = space.db.add(Task.make({ title, status: 'todo', milestone: milestone && Ref.make(milestone) }));
  Obj.setParent(task, taskSet);
  Obj.update(taskSet, (taskSet) => {
    taskSet.tasks = [...taskSet.tasks, Ref.make(task)];
  });
  return task;
};

/**
 * Waits for content that only appears once the story's own client has resolved the project's refs.
 * Each poll yields a frame and a resize the measured surfaces can act on, since testing-library's
 * polling alone produces neither. NOTE: this story still fails roughly one run in four because the
 * previous story's client is torn down asynchronously and can strip this story's resolver — the
 * article renders with every ref-gated section missing. Tracked in TASKS.md; `retry` covers it in
 * CI meanwhile.
 */
const findPainted = async (canvas: ReturnType<typeof within>, text: string) => {
  await waitFor(
    async () => {
      window.dispatchEvent(new Event('resize'));
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await expect(canvas.queryByText(text)).toBeTruthy();
    },
    { timeout: 10_000 },
  );
};

/** Radix unmounts an inactive tab panel, so a story asserts a tab's content only while it is shown. */
const showTab = async (canvas: ReturnType<typeof within>, tab: 'overview' | 'tasks') => {
  await userEvent.click(await canvas.findByTestId(`projectsPlugin.tab.${tab}`, undefined, { timeout: 10_000 }));
};

type StoryArgs = {
  role: string;
  attendableId: string;
};

const DefaultStory = ({ role, attendableId }: StoryArgs) => {
  const [space] = useSpaces();
  const projects = useQuery(space?.db, Filter.type(Project.Project));
  const project = projects.find((entry) => entry.name === PROJECT_NAME);
  if (!space?.db || !project) {
    return <Loading data={{ db: !!space?.db, project: !!project }} />;
  }

  // `AttendableContainer` marks the subtree with `data-attendable-id`, which is what the deck's
  // plank does in the app: without it nothing ever attends `attendableId`, so the article's toolbar
  // renders permanently unattended.
  // `AttendableContainer` marks the subtree with `data-attendable-id`, which is what the deck's
  // plank does in the app: without it nothing ever attends `attendableId`, so the article's toolbar
  // renders permanently unattended.
  return (
    <AttendableContainer id={attendableId} classNames='contents'>
      <ProjectArticle role={role} subject={project} attendableId={attendableId} />
    </AttendableContainer>
  );
};

const meta = {
  title: 'plugins/plugin-projects/containers/ProjectArticle',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        TasksPlugin.make(),
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
              const { defaultSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(async () => {
                createProject(defaultSpace);
                await defaultSpace.db.flush({ indexes: true });
              });
            }),
        }),
        StorybookPlugin.make({}),
      ],
    }),
  ],
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
  // Each story mounts its own client: drop the previous story's context so `seedContent` cannot
  // seed into a space that has already been torn down.
  beforeEach: () => {
    seeded = undefined;
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    role: 'article',
    attendableId: 'test',
  },
};

/**
 * Each section is asserted by its content rather than its heading, since an invalid surface id is
 * dropped silently and leaves the heading rendering over an empty section.
 */
export const Sections: Story = {
  ...Default,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await seedContent();

    // Header form: the project name renders as the editable name field's value. Identity/space
    // setup runs async, so allow more than testing-library's default 1s timeout.
    await expect(canvas.findByDisplayValue(PROJECT_NAME, undefined, { timeout: 10_000 })).resolves.toBeTruthy();

    // Instructions: the owned Instructions markdown editor mounts.
    await waitFor(() => expect(canvasElement.querySelector('.cm-editor')).toBeTruthy(), { timeout: 10_000 });

    // Artifacts: the section heading renders, and the seeded artifact's label resolves.
    await expect(canvas.findByText('Artifacts', undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    await findPainted(canvas, ARTIFACT_TITLE);

    // Tasks: behind its own toolbar tab, so switch to it. The task title is the load-bearing
    // assertion — an invalid surface id is dropped silently, leaving an empty panel.
    await showTab(canvas, 'tasks');
    await expect(canvas.findByText(TASK_TITLE, undefined, { timeout: 10_000 })).resolves.toBeTruthy();
  },
};

/**
 * A promoted item's link belongs to the project's own ledger, so following it shows the task where
 * the project keeps its tasks — the Tasks tab — rather than swapping the outline for a task form
 * inside the Overview.
 */
export const TaskLink: Story = {
  ...Default,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await seedContent();

    // Overview owns the outline, so the link is followed from a tab that is not the Tasks one.
    await expect(canvas.getByTestId('projectsPlugin.tab.tasks')).toHaveAttribute('data-state', 'inactive');

    const link = await canvas.findByText(TASK_TITLE, undefined, { timeout: 10_000 });
    await userEvent.click(link);

    await waitFor(
      () => expect(canvas.getByTestId('projectsPlugin.tab.tasks')).toHaveAttribute('data-state', 'active'),
      { timeout: 10_000 },
    );
    // The task is on the tab it navigated to, and the outline it came from is no longer shown.
    await expect(canvas.findByText(TASK_TITLE, undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    await waitFor(() => expect(canvas.queryByText(OUTLINE_ITEM)).toBeNull(), { timeout: 10_000 });
  },
};

/**
 * Every section stays live after its first paint. Each step below mutates the seeded objects the
 * way the operation verbs do and asserts the DOM follows — the failure this guards against is a
 * section that resolves once and then goes inert, which is how the previous parent-edge model
 * behaved (`Query.children()` never re-emitted on a member's property change).
 */
export const Updates: Story = {
  ...Default,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const { space, project, taskSet } = await seedContent();
    await showTab(canvas, 'tasks');
    await expect(canvas.findByText(TASK_TITLE, undefined, { timeout: 10_000 })).resolves.toBeTruthy();

    // 1. A member's own property change: renaming a task must reach its row.
    const RENAMED = 'Renamed in place';
    const [first] = TaskSet.resolveTasks(taskSet);
    Obj.update(first, (first) => {
      first.title = RENAMED;
    });
    await expect(canvas.findByText(RENAMED, undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    await waitFor(() => expect(canvas.queryByText(TASK_TITLE)).toBeNull(), { timeout: 10_000 });

    // 2. Membership change: a task appended to `taskSet.tasks` must appear.
    const ADDED_TASK = 'Added after mount';
    addTask(space, taskSet, ADDED_TASK);
    await expect(canvas.findByText(ADDED_TASK, undefined, { timeout: 10_000 })).resolves.toBeTruthy();

    // 3. A task filed under a milestone is still just a row: the article renders one flat list and
    //    does not group by milestone yet (see TASKS.md), so no heading or backlog split appears.
    const milestone = space.db.add(Milestone.make({ name: MILESTONE_NAME }));
    Obj.setParent(milestone, taskSet);
    Obj.update(taskSet, (taskSet) => {
      taskSet.milestones = [...taskSet.milestones, Ref.make(milestone)];
    });
    const MILESTONE_TASK = 'Filed under the milestone';
    addTask(space, taskSet, MILESTONE_TASK, milestone);
    // Its task is only a row: the task list does not group by milestone, so no backlog split appears.
    await expect(canvas.findByText(MILESTONE_TASK, undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    await waitFor(() => expect(canvas.queryByText('Backlog')).toBeNull(), { timeout: 10_000 });

    // The milestone renders in its own Overview section.
    await showTab(canvas, 'overview');
    await expect(canvas.findByText(MILESTONE_NAME, undefined, { timeout: 10_000 })).resolves.toBeTruthy();

    // A rename reaches the row, which holds its own subscription.
    Obj.update(milestone, (milestone) => {
      milestone.name = `${MILESTONE_NAME} (v2)`;
    });
    await expect(canvas.findByText(`${MILESTONE_NAME} (v2)`, undefined, { timeout: 10_000 })).resolves.toBeTruthy();

    // 5. Artifacts are an inline ref array on the project now, so appending a ref must add a card.
    const ADDED_ARTIFACT = 'Added artifact';
    const artifact = space.db.add(Text.make({ name: ADDED_ARTIFACT, content: 'More notes.' }));
    Obj.update(project, (project) => {
      project.artifacts = [...project.artifacts, Ref.make(artifact)];
    });
    await findPainted(canvas, ADDED_ARTIFACT);

    // 6. And removing the ref must drop the card — the delete path splices this array rather than
    //    going through a collection.
    Obj.update(project, (project) => {
      project.artifacts = project.artifacts.filter((ref) => ref.target?.id !== artifact.id);
    });
    await waitFor(() => expect(canvas.queryByText(ADDED_ARTIFACT)).toBeNull(), { timeout: 10_000 });
    await findPainted(canvas, ARTIFACT_TITLE);
  },
};
