//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Operation from '@dxos/compute/Operation';
import { Filter, Type } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { Dialog } from '@dxos/react-ui';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Milestone, Task } from '@dxos/types';

import { translations } from '#translations';
import { SpaceCapabilities, SpaceOperation } from '#types';

import { TaskInputSchema } from '../../capabilities/create-object.ts';
import * as SpaceOperationHandlerSet from '../../operations/SpaceOperationHandlerSet.ts';
import { ObjectFormDialog } from './ObjectFormDialog.tsx';

const DefaultStory = () => {
  const [space] = useSpaces();
  const tasks = useQuery(space?.db, Filter.type(Task.Task));

  return (
    <>
      {/* Readout for the play tests, outside the dialog: a submit closes it. */}
      <div
        className='p-4 bg-base-surface'
        data-testid='tasks'
      >{`tasks:${tasks.length} ${tasks.map((task) => task.title).join(',')}`}</div>
      {space ? (
        <Dialog.Root defaultOpen>
          <Dialog.Overlay>
            <ObjectFormDialog target={space.db} typename={Type.getTypename(Task.Task)} shouldNavigate={() => false} />
          </Dialog.Overlay>
        </Dialog.Root>
      ) : (
        <Loading />
      )}
    </>
  );
};

const meta = {
  title: 'plugins/plugin-space/containers/ObjectFormDialog/CreateTask',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      capabilities: [
        Capability.contribute(AppCapabilities.Translations, translations),
        Capability.contribute(Capabilities.OperationHandler, SpaceOperationHandlerSet.handlers),
        // The space plugin's own task entry, minus the module that lazy-loads it.
        Capability.contribute(SpaceCapabilities.CreateObjectEntry, {
          id: Type.getTypename(Task.Task),
          inputSchema: TaskInputSchema,
          createObject: (props, options) =>
            Operation.invoke(
              SpaceOperation.AddObject,
              { object: Task.make(props), target: options.target },
              { spaceId: options.db.spaceId },
            ),
        }),
      ],
      plugins: [
        ...corePlugins(),
        StorybookPlugin.make({}),
        ClientPlugin.make({
          types: [Task.Task, Milestone.Milestone],
          onClientInitialized: ({ client }) => Effect.asVoid(initializeIdentity(client)),
        }),
      ],
    }),
  ],
  tags: ['test'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The description is markdown; the form focuses it by its editor, which owns no label of its own. */
const findDescription = async () => {
  const form = await within(document.body).findByTestId('create-object-form', undefined, { timeout: 15_000 });
  return waitFor(() => {
    const editor = form.querySelector<HTMLElement>('[contenteditable="true"]');
    if (!editor) {
      throw new Error('Description editor not mounted.');
    }
    return editor;
  });
};

/** Cmd/Ctrl+Enter from the multi-line description creates the task and closes the dialog. */
export const SubmitWithKeyboard: Story = {
  play: async () => {
    const body = within(document.body);
    // Pasted rather than typed: the client boot already spends most of the story's time budget.
    await userEvent.click(await body.findByLabelText(/^title$/i, undefined, { timeout: 15_000 }));
    await userEvent.paste('Roast the samples');

    await userEvent.click(await findDescription());
    await userEvent.paste('Light, then medium.');
    await userEvent.keyboard('{Control>}{Enter}{/Control}');

    await waitFor(async () => expect(await body.findByTestId('tasks')).toHaveTextContent('tasks:1 Roast the samples'), {
      timeout: 5_000,
    });
    await waitFor(() => expect(body.queryByTestId('create-object-form')).toBeNull());
  },
};

/** With a blank title the chord does nothing: no task, the dialog stays open, and the editor gains no line. */
export const EmptyTitleIgnored: Story = {
  play: async () => {
    const body = within(document.body);
    await userEvent.click(await body.findByLabelText(/^title$/i, undefined, { timeout: 15_000 }));
    await userEvent.paste('   ');
    await userEvent.keyboard('{Control>}{Enter}{/Control}');

    const description = await findDescription();
    await userEvent.click(description);
    await userEvent.paste('Notes only');
    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    await userEvent.keyboard('{Meta>}{Enter}{/Meta}');

    await expect(body.getByTestId('tasks')).toHaveTextContent('tasks:0');
    await expect(body.getByTestId('create-object-form')).toBeInTheDocument();
    await expect(description.querySelectorAll('.cm-line')).toHaveLength(1);
  },
};
