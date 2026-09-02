//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as CrmPlugin from '@dxos/plugin-crm/CrmPlugin';
import * as InboxPlugin from '@dxos/plugin-inbox/InboxPlugin';
import * as ProgressPlugin from '@dxos/plugin-progress/ProgressPlugin';
import * as ProjectsPlugin from '@dxos/plugin-projects/ProjectsPlugin';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { withLayout } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { DebugSpaceObjectsPanel } from '../containers/DebugSpaceObjectsPanel/DebugSpaceObjectsPanel';
import { SpaceGenerator } from '../containers/SpaceGenerator/SpaceGenerator';

/**
 * Picking a sample space and watching it land.
 *
 * The generator lists whatever plugins contributed through `AppCapabilities.SampleSpace`; the panel
 * beside it is the same object tree the debug plugin shows in the app, so the collections, refs and
 * feeds a sample space builds are all inspectable here rather than only in an exported archive.
 */
const DefaultStory = () => {
  const [space] = useSpaces();
  if (!space) {
    return <></>;
  }

  return (
    <div className='dx-expand grid grid-cols-2 divide-x divide-separator'>
      <SpaceGenerator space={space} />
      <DebugSpaceObjectsPanel space={space} attendableId={space.id} />
    </div>
  );
};

/** Applies a sample space by label, then waits for the object tree to show something it built. */
const applySampleSpace = async (canvasElement: HTMLElement, label: string, expected: string) => {
  const canvas = within(canvasElement);
  // The contributing plugins activate on mount, so the row appears asynchronously.
  const create = await canvas.findByRole('button', { name: `Create ${label}` }, { timeout: 20_000 });
  await userEvent.click(create);
  // `getAllByText`: a sample space may name two objects the same (Tidepool's task set and its
  // project are both "Offline sync v2"), and `getByText` throws on more than one match.
  await waitFor(() => expect(canvas.getAllByText(expected).length).toBeGreaterThan(0), { timeout: 30_000 });
};

const meta = {
  title: 'plugins/plugin-debug/SampleSpaces',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager(() => ({
      plugins: [
        ...corePlugins(),
        StorybookPlugin.make({}),
        ProgressPlugin.make(),
        ClientPlugin.make({
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
            }),
        }),
        // Contributes the operation handlers the generators invoke (e.g. `SpaceOperation.AddType`).
        SpacePlugin({}),
        // The sample-space contributors. Their content loads only once the generator fires
        // `SampleSpacesRequested`, which it does on mount. Both declare plugin dependencies that
        // have to be present or they never activate — plugin-crm on inbox, plugin-projects on tasks.
        InboxPlugin.make(),
        TasksPlugin.make(),
        CrmPlugin.make(),
        ProjectsPlugin.make(),
      ],
    })),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Empty space plus the picker — click a sample space to fill it. */
export const Default: Story = {};

export const Tidepool: Story = {
  // Tagged so CI actually runs it: a sample space that stops building is a silent break otherwise.
  tags: ['test'],
  play: async ({ canvasElement }) => {
    await applySampleSpace(canvasElement, 'Tidepool — Offline sync v2', 'Offline sync v2');
  },
};

export const Northwind: Story = {
  tags: ['test'],
  play: async ({ canvasElement }) => {
    await applySampleSpace(canvasElement, 'Northwind Sales', 'Sales pipeline');
  },
};
