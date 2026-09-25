//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Chat from '@dxos/assistant/Chat';
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
import * as GitHubPlugin from '@dxos/plugin-github/GitHubPlugin';
import { FixtureLinkSourcePlugin } from '@dxos/plugin-github/testing';
import * as MarkdownEvents from '@dxos/plugin-markdown/MarkdownEvents';
import { PreviewEvents } from '@dxos/plugin-preview';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import * as ProjectsPlugin from '@dxos/plugin-projects/ProjectsPlugin';
import * as RoutinePlugin from '@dxos/plugin-routine/RoutinePlugin';
import { translations as routineTranslations } from '@dxos/plugin-routine/translations';
import * as SpacePlugin from '@dxos/plugin-space/SpacePlugin';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import { translations as tasksTranslations } from '@dxos/plugin-tasks/translations';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { type Space, useSpaces } from '@dxos/react-client/echo';
import { AttendableContainer, useSelection } from '@dxos/react-ui-attention';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { Loading, TestGrid, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';
import { Text } from '@dxos/schema';
import { Milestone, Outline, Repo, Task, TaskSet } from '@dxos/types';

import { translations } from '#translations';

import { ProjectTaskCompanion } from '../ProjectTaskCompanion/ProjectTaskCompanion.tsx';
import { ProjectArticle } from './ProjectArticle.tsx';

const PROJECT_NAME = 'Project 1';
const TASK_TITLE = 'Ship the tasks section';
// Carries both reference forms the markdown surfaces linkify: a bare URL and a `#nnn` issue.
const LINK_TASK_TITLE = 'Follow up on #12752 before the release';
const LINK_TASK_DESCRIPTION =
  'Spec at https://github.com/dxos/dxos/pull/12752 — the preview build is at https://pr-12752-composer-dev.dxos.workers.dev, and it supersedes #12431.';
const ARTIFACT_TITLE = 'Design Notes';
const TASK_ARTIFACT_TITLE = 'Cupping Sheet';
const TASK_QUESTION = 'Should the tasks section ship enabled by default?';
const TASK_ANSWER = 'On for internal spaces only';
const TASK_OPEN_QUESTION = 'Which spaces count as internal?';
const MILESTONE_NAME = 'Beta';
const OUTLINE_ITEM = 'Draft the launch checklist';

/**
 * The seeded graph, kept so a play function can mutate the source objects and assert the article
 * re-renders. The article is fed a live subject by the surface, so proving that a change to a
 * *referenced* object (a task's title, a new member of `taskSet.tasks`, a new artifact ref) reaches
 * the DOM is the only way to catch a section that resolved once and then went inert.
 */
let generation = 0;
let seeded:
  | { generation: number; space: Space; project: Project.Project; taskSet: TaskSet.TaskSet; task: Task.Task }
  | undefined;

/** Seeded at client init so every story starts populated, including the ones with no play function. */
const createProject = (space: Space, storyGeneration: number) => {
  const project = space.db.add(Project.make({ name: PROJECT_NAME }));
  const taskSet = project.taskSet?.target;
  if (!taskSet) {
    throw new Error('Expected the project to own a task set.');
  }
  const outline = project.outline?.target;
  if (!outline?.content.target) {
    throw new Error('Expected the project to own an outline.');
  }

  // The project names its repository, which is what makes a `#nnn` reference in its documents
  // resolve (plugin-github reads `project.repo`).
  const repo = space.db.add(Repo.make({ name: 'dxos', owner: 'dxos', url: 'https://github.com/dxos/dxos' }));
  const instructions = Instructions.make({
    [Obj.Parent]: project,
    text: 'You are an assistant focused on this project.',
  });
  const artifact = space.db.add(Text.make({ name: ARTIFACT_TITLE, content: 'Notes.' }));
  Obj.update(project, (project) => {
    project.repo = Ref.make(repo);
    project.instructions = Ref.make(instructions);
    project.artifacts = [Ref.make(artifact)];
  });

  const task = space.db.add(Task.make({ [Obj.Parent]: taskSet, title: TASK_TITLE, status: 'todo' }));
  // An exchange in the log, written by the verbs that write it in the app rather than by hand: the
  // pair is what the detail pane renders as two lines — the question an agent asked, and the answer
  // it was resumed on. `answer` refuses an id that is not in this task's log, so seeding through
  // them is also the check that the two entries are joined.
  const question = Task.ask(task, {
    text: TASK_QUESTION,
    context: 'The section ships behind a flag either way; the question is what the flag defaults to.',
    options: [{ title: TASK_ANSWER }, { title: 'Off for everyone' }],
    actor: { role: 'assistant', name: 'Scout' },
  });
  Task.answer(task, question.id, TASK_ANSWER, { actor: { role: 'user', name: 'Rich' } });
  // A second question, left open: answered, a question is a record and reads as two lines of the
  // log; open, it is a prompt the pane puts to the reader, which is the other half of the surface.
  Task.ask(task, {
    text: TASK_OPEN_QUESTION,
    context: 'Nobody has said which spaces count as internal, and the flag needs a list.',
    options: [{ title: 'Every space the team owns' }, { title: 'Only the demo space' }],
    actor: { role: 'assistant', name: 'Scout' },
  });
  // What the task produced, linked the way the verbs link it: a ref on the task, with the object
  // filed in the space rather than parented to the task.
  Task.addArtifact(task, space.db.add(Text.make({ name: TASK_ARTIFACT_TITLE, content: 'Cupping sheet.' })));
  const linkTask = space.db.add(
    Task.make({
      [Obj.Parent]: taskSet,
      title: LINK_TASK_TITLE,
      description: LINK_TASK_DESCRIPTION,
      status: 'todo',
    }),
  );
  Obj.update(taskSet, (taskSet) => {
    taskSet.tasks = [Ref.make(task), Ref.make(linkTask)];
  });

  // The third item is what promotion leaves behind: a link to the task in the project's set.
  Obj.update(outline.content.target, (text) => {
    text.content = `- [ ] ${OUTLINE_ITEM}\n- [ ] Review #12752 before the release\n- [ ] [${TASK_TITLE}](${Obj.getURI(task)})\n`;
  });

  seeded = { generation: storyGeneration, space, project, taskSet, task };
};

/** Waits for the seeded graph a play function asserts against; the writes happen at client init. */
const seedContent = async () => {
  // `play` runs once the story has mounted but not necessarily once the client has finished
  // initializing — the project is created by the plugin's `onClientInitialized`.
  await waitFor(() => expect(seeded?.generation).toBe(generation), { timeout: 10_000 });
  const context = seeded;
  if (!context) {
    throw new Error('The story did not create a project.');
  }
  await context.space.db.flush({ indexes: true });
  return context;
};

/** Adds a task to the set the way the verbs do — array membership plus the lifecycle parent edge. */
const addTask = (space: Space, taskSet: TaskSet.TaskSet, title: string, milestone?: Milestone.Milestone) => {
  const task = space.db.add(
    Task.make({ [Obj.Parent]: taskSet, title, status: 'todo', milestone: milestone && Ref.make(milestone) }),
  );
  Obj.update(taskSet, (taskSet) => {
    taskSet.tasks.push(Ref.make(task));
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

/**
 * The project and the task it opens, side by side — the master-detail the deck renders as two planks
 * (see `docs/TASK-DETAIL.md`). The grid stands in for the deck, as `MailboxArticle`'s three-column
 * story does: the ledger row publishes its selection through `LayoutOperation.Select`, this reads it
 * back, and the detail is the same `Task` article surface the deck would mount.
 */
const MasterDetailStory = ({ role, attendableId }: StoryArgs) => {
  const [space] = useSpaces();
  const projects = useQuery(space?.db, Filter.type(Project.Project));
  const project = projects.find((entry) => entry.name === PROJECT_NAME);
  const tasks = useQuery(space?.db, Filter.type(Task.Task));
  const selectedId = useSelection(attendableId, 'single');
  const task = tasks.find((entry) => entry.id === selectedId);
  if (!space?.db || !project) {
    return <Loading data={{ db: !!space?.db, project: !!project }} />;
  }

  return (
    <TestGrid.Root>
      <TestGrid.Stack>
        <TestGrid.Panel>
          <AttendableContainer id={attendableId} classNames='contents'>
            <ProjectArticle role={role} subject={project} attendableId={attendableId} />
          </AttendableContainer>
        </TestGrid.Panel>
        {task && (
          <TestGrid.Panel>
            {/* The companion the deck mounts, not the task article directly: it reads the ledger's
                selection itself, renders the article through the surface (so plugin-tasks'
                `article.task` registration is still what resolves). */}
            <ProjectTaskCompanion role={role} attendableId={attendableId} companionTo={project} />
          </TestGrid.Panel>
        )}
      </TestGrid.Stack>
    </TestGrid.Root>
  );
};

/**
 * No-op for the one layout operation the ledger row invokes that belongs to DeckPlugin, which this
 * story does not install. `Select` is deliberately NOT stubbed: it belongs to AttentionPlugin (in
 * `corePlugins`), and it is what publishes the row the detail panel reads back.
 */
const MockDeckOperations = Capability.inlineModule(
  'operation-handler',
  { provides: [Capabilities.OperationHandler] },
  () =>
    Effect.succeed([
      Capability.contribute(
        Capabilities.OperationHandler,
        OperationHandlerSet.make(Operation.withHandler(LayoutOperation.Open, () => Effect.succeed([] as string[]))),
      ),
    ]),
);

const MockDeckOperationsPlugin = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.projects.story.mockDeckOperations'),
    name: 'Mock Deck Ops',
  }),
).pipe(Plugin.addModule(MockDeckOperations), Plugin.make);

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
        // The plugin under test, for its own contributions rather than its surfaces: the `TaskAction`
        // module is what puts an action on a task row, and Assistant supplies the `CreateChat`
        // handler that action runs.
        ProjectsPlugin.make(),
        AssistantPlugin.make(),
        // For the card stack under the task companion: the surface is plugin-space's, so without it
        // the companion renders the article alone and the stack silently resolves to nothing.
        SpacePlugin.make({}),
        // Provides `RemoteProcessManager`, which Assistant's `AgentService` spec now requires — the
        // spec is pruned without it, so delegating a task fails with "Chat not found".
        RoutinePlugin.make(),
        // Contributes the `#123` decoration (`project.repo` is what it resolves against), the link
        // chips, and the resolver behind a chip's hover card; PreviewPlugin owns the popover and the
        // fixture source answers the resolver without the network.
        GitHubPlugin.make(),
        PreviewPlugin.make(),
        FixtureLinkSourcePlugin(),
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
            Repo.Repo,
          ],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              // Read before the first yield: this client belongs to the story whose `beforeEach`
              // most recently ran, and a slower predecessor keeps the generation it started under.
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
      // Both start events at setup, so the markdown extensions and the link resolver are live before
      // the first render.
      setupEvents: [MarkdownEvents.Start, PreviewEvents.Start],
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
  // Each story mounts its own client: drop the previous story's context, and move the generation
  // on so a predecessor that finishes initializing late cannot publish its graph as this story's.
  beforeEach: () => {
    seeded = undefined;
    generation += 1;
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
 * Master-detail: the ledger on the left, the selected task's article on the right — what the deck
 * shows as two planks once a row is clicked.
 */
export const TaskDetail: Story = {
  ...Default,
  render: MasterDetailStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await seedContent();
    await showTab(canvas, 'tasks');
    await userEvent.click(await canvas.findByText(TASK_TITLE, undefined, { timeout: 10_000 }));
    // The detail panel renders the same title as an editable field, so the form is what is asserted
    // rather than a second copy of the row's text.
    await expect(canvas.findByDisplayValue(TASK_TITLE, undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    // What the task produced, under its editor: the card grid the task article hands its artifacts
    // to. Scoped to the grid rather than the canvas — the ledger row carries a chip with the same
    // text, which would pass this assertion with no grid rendered at all.
    const cards = () => canvasElement.querySelector<HTMLElement>('[data-testid="cardMasonry"]');
    await waitFor(() => expect(cards()).toBeTruthy(), { timeout: 10_000 });
    // Once only: the companion used to render the same artifacts a second time beneath the article.
    await expect(canvasElement.querySelectorAll('[data-testid="cardMasonry"]')).toHaveLength(1);
    // The exchange reads as two lines of the log: what was asked, and what it was answered with.
    // Answered, so it is a record rather than a prompt — the pane offers no controls for it.
    const history = () => canvasElement.querySelector<HTMLElement>('[data-testid="taskList.history"]');
    await waitFor(() => expect(history()).toBeTruthy(), { timeout: 10_000 });
    await expect(within(history()!).findByText(TASK_QUESTION, undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    await expect(within(history()!).findByText(TASK_ANSWER, undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    // The open one is a prompt instead: its text, the options it suggests, and a field for an answer
    // it did not think of. Scoped to the prompt, since the ledger row summarises every question.
    const prompt = () => canvasElement.querySelector<HTMLElement>('[data-testid="task-question"]:has(input)');
    await waitFor(() => expect(prompt()).toBeTruthy(), { timeout: 10_000 });
    await expect(
      within(prompt()!).findByText(TASK_OPEN_QUESTION, undefined, { timeout: 10_000 }),
    ).resolves.toBeTruthy();
    await expect(within(prompt()!).findAllByTestId('task-question.option')).resolves.toHaveLength(2);
    // The answered one stays a record: exactly one prompt, not two.
    await expect(canvasElement.querySelectorAll('[data-testid="task-question.input"]')).toHaveLength(1);

    // `findAllByText`: the card names the artifact in its header and again in the form its type
    // contributes as the card's body, so the single-match query would throw on its own success.
    await expect(
      within(cards()!).findAllByText(TASK_ARTIFACT_TITLE, undefined, { timeout: 10_000 }),
    ).resolves.not.toHaveLength(0);

    // The description is edited with the host's contributed extensions live in it, as the ledger's
    // own strip is: a task opened in the pane decorates `#123` and a pull-request URL rather than
    // showing the reader raw markdown the list would have rendered.
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
    // A pasted URL is a chip here as it is in the row: the reader wrote a bare link either way, and
    // the pane used to leave it as raw text while the row named it `#12752`.
    await waitFor(
      async () =>
        await expect(
          [...(editor()?.querySelectorAll('.dx-tag--anchor') ?? [])].map((chip) => chip.textContent),
        ).toContain('#12752'),
      { timeout: 10_000 },
    );
  },
};

/** The article opened on its Tasks tab: the seeded set, its two tasks, and the delegate toolbar. */
export const Tasks: Story = {
  ...Default,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await seedContent();
    await showTab(canvas, 'tasks');
    await expect(canvas.findByText(TASK_TITLE, undefined, { timeout: 10_000 })).resolves.toBeTruthy();
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

    // The tabs are painted, not just present: a `w-full` sibling toolbar once squeezed the tablist
    // to zero width, and its scroll container clipped both buttons while every query still found them.
    const tablist = (await canvas.findByRole('tablist', undefined, { timeout: 10_000 })) as HTMLElement;
    await waitFor(() => expect(tablist.clientWidth).toBeGreaterThanOrEqual(tablist.scrollWidth), { timeout: 10_000 });
    await expect(tablist.getBoundingClientRect().width).toBeGreaterThan(0);

    // Tasks: behind its own toolbar tab, so switch to it. The task title is the load-bearing
    // assertion — an invalid surface id is dropped silently, leaving an empty panel.
    await showTab(canvas, 'tasks');
    await expect(canvas.findByText(TASK_TITLE, undefined, { timeout: 10_000 })).resolves.toBeTruthy();
  },
};

/** The contributed action's label, as written in `capabilities/task-action.ts`. */
const TASK_ACTION_LABEL = 'Assign to agent';

/**
 * The whole cross-plugin path in one gesture: plugin-projects contributes a `TaskAction`, the task
 * row shows it, and running it invokes the operation that opens a chat carrying the task.
 *
 * Asserted on the database rather than on any UI the chat might get, since the point is that the
 * contribution reached the row and the row reached the operation.
 */
export const TaskAction: Story = {
  ...Default,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const { space, task } = await seedContent();

    await showTab(canvas, 'tasks');
    const title = await canvas.findByText(TASK_TITLE, undefined, { timeout: 10_000 });

    // Scoped to this task's own row — every row carries a menu, so the seeded task has to be found
    // through its title rather than by picking the first trigger on the page.
    const row = title.closest('[data-testid="taskList.item"]');
    await expect(row).toBeTruthy();

    // Two actions on the row (the contributed one plus the list's own delete), so they collapse into
    // the overflow menu rather than rendering as a bare button.
    const trigger = await within(row as HTMLElement).findByTestId('taskList.item.actions', undefined, {
      timeout: 10_000,
    });
    await userEvent.click(trigger);

    // Every item resolves to a label: a key rendered raw (`delete-task.label`) means the container
    // looked it up in a namespace that does not hold it, which typechecks and reaches the user.
    const menu = (await screen.findByRole('menu', undefined, { timeout: 10_000 })).textContent ?? '';
    await expect(menu).not.toMatch(/\.label\b/);

    // The label the contribution carries (`capabilities/task-action.ts`); a rename there has to be
    // made here too, which is the point — the assertion is that the row shows what was contributed.
    const item = await screen.findByText(TASK_ACTION_LABEL, undefined, { timeout: 10_000 });
    await userEvent.click(item);

    // The chat is named for the task and carries it in its checklist.
    await waitFor(
      async () => {
        const chats = await space.db.query(Filter.type(Chat.Chat)).run();
        const chat = chats.find((chat) => chat.name === TASK_TITLE);
        if (!chat) {
          throw new Error('Chat not found.');
        }
        await expect(chat.tasks.map((ref) => Task.refEntityId(ref))).toContain(task.id);
      },
      { timeout: 10_000 },
    );
  },
};

/**
 * Following a promoted item's link opens the task where the outline sits, and comes back from it.
 *
 * The host used to take the click and switch its own tab, through an `onSelectTask` callback passed
 * as Surface data; that channel is gone, so the outline's own behaviour stands — the section shows
 * the task's form, and Back returns to the outline. Re-routing this to the Tasks tab is the host's
 * to do through an operation (see TASKS.md Phase 15).
 */
/**
 * The toolbar half of the same path: the rows' checkboxes and the toolbar action read one selection,
 * held in `react-ui-attention` view state under the task set's id, and the action hands the whole
 * checked set to ONE chat rather than a chat per task.
 */
export const DelegateCheckedTasks: Story = {
  ...Default,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const { space, taskSet } = await seedContent();
    const [first, second] = TaskSet.resolveTasks(taskSet);

    await showTab(canvas, 'tasks');
    await expect(canvas.findByText(TASK_TITLE, undefined, { timeout: 10_000 })).resolves.toBeTruthy();

    // Nothing checked: the action is present but dead, rather than absent and then appearing.
    const button = await canvas.findByTestId('projectsPlugin.delegateTasks', undefined, { timeout: 10_000 });
    await expect(button).toBeDisabled();

    // Checked in reverse reading order, so the assertion below distinguishes tick order from the
    // order the rows are shown in.
    // Matched among all of the title's occurrences rather than expecting one: once the pipeline is
    // open the chart names every lane too, so the title is on the page twice.
    const checkbox = async (title: string) => {
      const labels = await canvas.findAllByText(title, undefined, { timeout: 10_000 });
      const row = labels.map((label) => label.closest('[data-testid="taskList.item"]')).find(Boolean);
      await expect(row).toBeTruthy();
      return within(row as HTMLElement).getByTestId('taskList.item.checkbox');
    };
    await userEvent.click(await checkbox(LINK_TASK_TITLE));
    await userEvent.click(await checkbox(TASK_TITLE));

    await waitFor(() => expect(button).toBeEnabled(), { timeout: 10_000 });
    await userEvent.click(button);

    // One chat holding both, in the order the list shows them — not the order they were ticked.
    await waitFor(
      async () => {
        const chats = await space.db.query(Filter.type(Chat.Chat)).run();
        const chat = chats.find((chat) => chat.tasks.length === 2);
        if (!chat) {
          throw new Error('Chat not found.');
        }
        await expect(chat.tasks.map((ref) => Task.refEntityId(ref))).toEqual([first.id, second.id]);
      },
      { timeout: 10_000 },
    );

    // The boxes clear with the work, so the toolbar is dead again, and the session's chat filing
    // itself under the project is what brings the pipeline into view under the ledger.
    await waitFor(() => expect(button).toBeDisabled(), { timeout: 10_000 });
    await expect(
      canvas.findByTestId('projectsPlugin.pipeline.chart', undefined, { timeout: 10_000 }),
    ).resolves.toBeTruthy();

    // Re-checking rows the agent already holds arms nothing: a second click cannot fork them into
    // another session.
    await userEvent.click(await checkbox(TASK_TITLE));
    await userEvent.click(await checkbox(LINK_TASK_TITLE));
    await expect(button).toBeDisabled();
  },
};

export const TaskLink: Story = {
  ...Default,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await seedContent();

    // Overview owns the outline, so the link is followed from a tab that is not the Tasks one.
    // `find`, not `get`: seeding completes at client init, which can be before the article mounts.
    await expect(await canvas.findByTestId('projectsPlugin.tab.tasks', undefined, { timeout: 10_000 })).toHaveAttribute(
      'aria-selected',
      'false',
    );

    const link = await canvas.findByText(TASK_TITLE, undefined, { timeout: 10_000 });
    await userEvent.click(link);

    // The section swaps the outline for the task's form; the tab the host owns is untouched.
    await expect(canvas.findByDisplayValue(TASK_TITLE, undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    await waitFor(() => expect(canvas.queryByText(OUTLINE_ITEM)).toBeNull(), { timeout: 10_000 });
    await expect(canvas.getByTestId('projectsPlugin.tab.tasks')).toHaveAttribute('aria-selected', 'false');

    // Back is the way out, and the outline it came from is shown again.
    // The label plugin-tasks contributes for the outline's own back action.
    await userEvent.click(await canvas.findByRole('button', { name: 'Back to outline' }, { timeout: 10_000 }));
    await expect(canvas.findByText(OUTLINE_ITEM, undefined, { timeout: 10_000 })).resolves.toBeTruthy();
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
    const milestone = space.db.add(Milestone.make({ [Obj.Parent]: taskSet, name: MILESTONE_NAME }));
    Obj.update(taskSet, (taskSet) => {
      taskSet.milestones.push(Ref.make(milestone));
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
      project.artifacts.push(Ref.make(artifact));
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
