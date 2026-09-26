//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Blob, Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as FilePlugin from '@dxos/plugin-file/FilePlugin';
import * as MarkdownEvents from '@dxos/plugin-markdown/MarkdownEvents';
import { PreviewEvents } from '@dxos/plugin-preview';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import * as SpacePlugin from '@dxos/plugin-space/SpacePlugin';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { type Space, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';
import { Text } from '@dxos/schema';
import { File, Person, Task, TaskSet } from '@dxos/types';

import { translations } from '#translations';

import * as TasksPlugin from '../../TasksPlugin.ts';
import { TaskArticle } from './TaskArticle.tsx';

const WORKED_TASK = 'Finalize roast curve';
const PLAIN_TASK = 'Design label';

/** Kept so a play function can mutate the task and assert the pane follows. */
let seeded: { space: Space; worked: Task.Task } | undefined;

/**
 * History as the verbs write it — one entry per thing that happened to the work, oldest first. No
 * `id`: the field is optional and an `EntityId` when present, so a literal label fails validation.
 */
const history = (...descriptions: string[]): Task.HistoryEntry[] =>
  descriptions.map((description, index) => ({
    date: new Date(Date.now() - (descriptions.length - index) * 8 * 60_000).toISOString(),
    event: index === 0 ? ('created' as const) : ('updated' as const),
    actor: index % 2 === 0 ? { name: 'Rich', role: 'user' as const } : { name: 'Scout', role: 'assistant' as const },
    description,
  }));

/**
 * Two tasks in one set: one worked — description, assignee, history and three artifacts — and one
 * bare, so the pane can be seen with everything it renders and with only its editor.
 */
const seedTasks = (space: Space) => {
  const taskSet = space.db.add(TaskSet.make({ name: 'Spring Blend Launch' }));
  const kai = space.db.add(Obj.make(Person.Person, { fullName: 'Kai Watanabe' }));
  const worked = space.db.add(
    Task.make({
      [Obj.Parent]: taskSet,
      title: WORKED_TASK,
      status: 'started',
      priority: 'high',
      estimate: 'm',
      assignee: { contact: Ref.make(kai) },
      description:
        'Target a 12 minute development window; log every profile so the next batch can be reproduced from the notes rather than from memory.',
      history: history(
        'Task created.',
        'Assigned to Kai Watanabe.',
        'Estimate set to M.',
        'Priority changed from medium to high.',
        'Status changed from todo to started.',
      ),
    }),
  );

  // Artifacts are refs to objects filed in the space, not children of the task — the way
  // `Task.addArtifact` links them, and what the pane's artifact cards resolve.
  for (const [name, content] of [
    ['Cupping Sheet', 'Sweetness 7, acidity 8, body 6. Second crack at 9:40.'],
    ['Roast Log — Batch 14', 'Charge 198°C, turnaround 1:35, development 2:10.'],
    ['Supplier Notes', 'Two Ethiopian lots and one Colombian, sampled before committing to a full bag.'],
  ] as const) {
    Task.addArtifact(worked, space.db.add(Text.make({ name, content })));
  }

  const plain = space.db.add(Task.make({ [Obj.Parent]: taskSet, title: PLAIN_TASK, status: 'todo' }));
  Obj.update(taskSet, (taskSet) => {
    taskSet.tasks = [Ref.make(worked), Ref.make(plain)];
  });

  seeded = { space, worked };
};

/** A 4×3 PNG of three coloured rows, standing in for a screenshot. */
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAIAAAA7ljmRAAAAGUlEQVR4nGN47mMDRwx6ZwrhiMFkxm04AgBTKBIF1eRh+AAAAABJRU5ErkJggg==';

const pngFile = () =>
  new globalThis.File([Uint8Array.from(atob(PNG_BASE64), (character) => character.charCodeAt(0))], 'screenshot.png', {
    type: 'image/png',
  });

/** Dispatches the native drag sequence a file dragged in from the desktop produces. */
const dropFiles = (target: Element, files: globalThis.File[]) => {
  const dataTransfer = new DataTransfer();
  files.forEach((file) => dataTransfer.items.add(file));
  for (const type of ['dragenter', 'dragover', 'drop']) {
    target.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer }));
  }
};

type StoryArgs = {
  /** Title of the task the pane opens. */
  title: string;
};

const DefaultStory = ({ title }: StoryArgs) => {
  const [space] = useSpaces();
  const tasks = useQuery(space?.db, Filter.type(Task.Task));
  const task = tasks.find((candidate) => candidate.title === title);
  if (!task) {
    return <Loading data={{ db: !!space?.db, task: false }} />;
  }

  return (
    <div className='dx-expand'>
      <TaskArticle role='article' subject={task} attendableId='story' />
    </div>
  );
};

/**
 * The plugin manager, not a bare client provider: the pane edits through `TaskOperation.UpdateTask`,
 * which throws without PluginManagerContext and dies with NoHandlerError without the plugin below.
 * Per story, so a story can run with or without plugin-file.
 */
const withPlugins = ({ files }: { files: boolean }) =>
  withPluginManager({
    plugins: [
      ...corePlugins(),
      TasksPlugin.make(),
      // The card grid under the editor: `cardMasonry` is plugin-space's surface, so without this
      // plugin the artifacts resolve to nothing and the pane renders the editor alone.
      SpacePlugin.make({}),
      // Fills each card's body: a card with no `CardContent` surface is its header alone.
      PreviewPlugin.make(),
      ClientPlugin.make({
        types: [Task.Task, TaskSet.TaskSet, Person.Person, Text.Text, File.File, Blob.Blob],
        onClientInitialized: ({ client }) =>
          Effect.gen(function* () {
            const { defaultSpace } = yield* initializeIdentity(client);
            yield* Effect.promise(async () => {
              seedTasks(defaultSpace);
              await defaultSpace.db.flush({ indexes: true });
            });
          }),
      }),
      StorybookPlugin.make({}),
      // Handles `FileOperation.Create`: without it the pane offers no drop at all.
      ...(files ? [FilePlugin.make()] : []),
    ],
    setupEvents: [MarkdownEvents.Start, PreviewEvents.Start],
  });

const meta = {
  title: 'plugins/plugin-tasks/containers/TaskArticle',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [...translations, ...reactUiTranslations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A worked task: title and description in the editor, its history beneath, its artifacts as cards. */
export const Default: Story = {
  decorators: [withPlugins({ files: false })],
  args: { title: WORKED_TASK },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The title is a field, not text: the pane holds exactly this task selected, so it is always editing.
    await expect(canvas.findByDisplayValue(WORKED_TASK, undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    await expect(
      canvas.findByText('Status changed from todo to started.', undefined, { timeout: 10_000 }),
    ).resolves.toBeTruthy();

    // The cards under the editor are `plugin-space`'s `cardMasonry` surface, which never mounts in
    // this package's storybook (see the tracked item in plugin-projects' TASKS.md) — so assert what
    // the article owns, and leave the cards to the companion story where they do render.
    // The properties read as a list, each row naming the value its glyph stands for — including the
    // assignee, which is a person in the space rather than a literal on the task.
    const properties = canvasElement.querySelector<HTMLElement>('[data-testid="taskList.properties"]');
    await waitFor(() => expect(properties).toBeTruthy(), { timeout: 10_000 });
    await expect(properties?.querySelector('[data-testid="taskList.property.status"]')?.textContent).toContain(
      'Started',
    );
    await waitFor(
      async () =>
        await expect(properties?.querySelector('[data-testid="taskList.property.assignee"]')?.textContent).toContain(
          'Kai Watanabe',
        ),
      { timeout: 10_000 },
    );

    const context = seeded;
    if (!context) {
      throw new Error('The story did not seed a task.');
    }
    await expect(context.worked.artifacts).toHaveLength(3);
  },
};

/** A task nobody has worked yet: the editor alone, with no history and no cards under it. */
export const Plain: Story = {
  decorators: [withPlugins({ files: false })],
  args: { title: PLAIN_TASK },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByDisplayValue(PLAIN_TASK, undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    // Nothing produced yet, so nothing is passed to the grid — and nothing renders under the editor
    // whether or not the surface mounts.
    await waitFor(() => expect(canvasElement.querySelector('[data-testid="cardMasonry"]')).toBeNull(), {
      timeout: 10_000,
    });
  },
};

/**
 * A file dropped on the task becomes a `File` attachment that previews as an image, and can be
 * removed; both are recorded in the task's history.
 */
export const DropAttachment: Story = {
  decorators: [withPlugins({ files: true })],
  args: { title: PLAIN_TASK },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const zone = await canvas.findByTestId('tasksPlugin.attachments.dropZone', undefined, { timeout: 10_000 });
    const dropArea = await canvas.findByTestId('tasksPlugin.attachments.dropArea');

    // Dragging over the pane marks the drop area, not the pane.
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(pngFile());
    zone.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer }));
    await waitFor(() => expect(dropArea).toHaveClass('border-accent-bg'));
    zone.dispatchEvent(new DragEvent('dragleave', { bubbles: true, cancelable: true, dataTransfer }));
    await waitFor(() => expect(dropArea).not.toHaveClass('border-accent-bg'));

    dropFiles(zone, [pngFile()]);
    const attachment = await canvas.findByTestId('tasksPlugin.attachment', undefined, { timeout: 10_000 });
    await expect(within(attachment).getByText('screenshot.png')).toBeInTheDocument();
    await waitFor(() => expect(attachment.querySelector('img')).not.toBeNull(), { timeout: 10_000 });
    await expect(canvas.findByText('Attached "screenshot.png".')).resolves.toBeInTheDocument();

    await userEvent.click(within(attachment).getByRole('button', { name: 'Remove attachment' }));
    await waitFor(() => expect(canvas.queryByTestId('tasksPlugin.attachment')).toBeNull());
    await expect(canvas.findByText('Removed attachment "screenshot.png".')).resolves.toBeInTheDocument();
  },
};

/** A landscape image that is not 16:9, so a card that letterboxed it would show bars. */
const diagramFile = async (): Promise<globalThis.File> => {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 400;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (const [x, y, color] of [
      [60, 160, '#c0624a'],
      [250, 160, '#8fd3b0'],
      [440, 160, '#4b3a8a'],
    ] as const) {
      context.fillStyle = color;
      context.fillRect(x, y, 140, 60);
    }
  }
  const blob = await new Promise<globalThis.Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  return new globalThis.File(blob ? [blob] : [], 'diagram.png', { type: 'image/png' });
};

/**
 * A task carrying an image and a text file, left in place to see the cards: the image spans its
 * card, the text file shows its type and size.
 */
export const WithAttachments: Story = {
  decorators: [withPlugins({ files: true })],
  args: { title: PLAIN_TASK },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const zone = await canvas.findByTestId('tasksPlugin.attachments.dropZone', undefined, { timeout: 10_000 });
    dropFiles(zone, [
      await diagramFile(),
      new globalThis.File(['Sweetness 7, acidity 8, body 6.'], 'cupping-notes.txt', { type: 'text/plain' }),
    ]);

    await waitFor(() => expect(canvas.getAllByTestId('tasksPlugin.attachment')).toHaveLength(2), { timeout: 10_000 });
    await waitFor(
      () => expect(canvasElement.querySelector('[data-testid="tasksPlugin.attachment"] img')).not.toBeNull(),
      {
        timeout: 10_000,
      },
    );
    // The stored file's card can render a moment before its attach settles and clears the pending card.
    await waitFor(() => expect(canvas.queryByTestId('tasksPlugin.attachment.pending')).toBeNull(), { timeout: 10_000 });
  },
};

/** Without plugin-file nothing can store a file, so the pane offers no drop at all. */
export const WithoutFilePlugin: Story = {
  decorators: [withPlugins({ files: false })],
  args: { title: PLAIN_TASK },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByDisplayValue(PLAIN_TASK, undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    await expect(canvas.queryByTestId('tasksPlugin.attachments.dropZone')).toBeNull();
    await expect(canvas.queryByTestId('tasksPlugin.attachments.dropArea')).toBeNull();
  },
};
