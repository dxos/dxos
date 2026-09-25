//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Blob, Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as FilePlugin from '@dxos/plugin-file/FilePlugin';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';
import { File, Task } from '@dxos/types';

import { translations } from '#translations';

import * as TasksPlugin from '../../TasksPlugin.ts';
import { TaskArticle } from './TaskArticle.tsx';

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

const DefaultStory = () => {
  const [space] = useSpaces();
  const [task] = useQuery(space?.db, Filter.type(Task.Task));
  if (!task) {
    return <Loading data={{ db: !!space?.db, task: false }} />;
  }

  return (
    <div className='dx-expand'>
      <TaskArticle role='article' subject={task} attendableId='story' />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-tasks/containers/TaskArticle',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin.make({
          types: [Task.Task, File.File, Blob.Blob],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(async () => {
                defaultSpace.db.add(
                  Task.make({
                    title: 'Fix the toolbar overflow',
                    status: 'started',
                    description: 'The toolbar wraps below 480px; drop a screenshot here to attach it.',
                  }),
                );
                await defaultSpace.db.flush({ indexes: true });
              });
            }),
        }),
        StorybookPlugin.make({}),
        TasksPlugin.make(),
        // Handles `FileOperation.Create` and contributes the file card that previews an attachment.
        FilePlugin.make(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [...translations, ...reactUiTranslations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A file dropped on the task becomes a `File` attachment that previews as an image, and can be removed. */
export const DropAttachment: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const zone = await canvas.findByTestId('tasksPlugin.attachments.dropZone', undefined, { timeout: 10_000 });

    dropFiles(zone, [pngFile()]);
    const attachment = await canvas.findByTestId('tasksPlugin.attachment', undefined, { timeout: 10_000 });
    await expect(within(attachment).getByText('screenshot.png')).toBeInTheDocument();
    await waitFor(() => expect(attachment.querySelector('img')).not.toBeNull(), { timeout: 10_000 });

    await userEvent.click(within(attachment).getByRole('button', { name: 'Remove attachment' }));
    await waitFor(() => expect(canvas.queryByTestId('tasksPlugin.attachment')).toBeNull());
  },
};
