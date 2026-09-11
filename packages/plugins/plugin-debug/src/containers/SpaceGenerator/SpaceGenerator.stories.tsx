//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter, Obj, Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as ProgressPlugin from '@dxos/plugin-progress/ProgressPlugin';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { ScrollArea } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';
import { withLayout } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { SpaceGenerator } from './SpaceGenerator.tsx';

/** Live list of every object in the space — updates as the generator creates objects. */
const ObjectList = ({ space }: { space: Parameters<typeof SpaceGenerator>[0]['space'] }) => {
  const objects = useQuery(space.db, Query.select(Filter.everything()));

  return (
    <ScrollArea.Root thin orientation='vertical'>
      <ScrollArea.Viewport>
        <Listbox.Root>
          <Listbox.Content>
            {objects.map((object) => (
              <Listbox.Item key={object.id} id={object.id} classNames='px-2 gap-2'>
                <div className='flex flex-col grow truncate'>
                  <span className='truncate'>{Obj.getLabel(object) ?? object.id}</span>
                  <span className='text-description text-sm truncate'>{Obj.getTypename(object)}</span>
                </div>
              </Listbox.Item>
            ))}
          </Listbox.Content>
        </Listbox.Root>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};

const DefaultStory = () => {
  const [space] = useSpaces();
  if (!space) {
    return <></>;
  }

  return (
    <div className='dx-expand grid grid-cols-2 divide-x divide-separator'>
      <SpaceGenerator space={space} />
      <ObjectList space={space} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-debug/containers/SpaceGenerator',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager(() => ({
      plugins: [
        ...corePlugins(),
        StorybookPlugin.make({}),
        // Hosts the ProgressRegistry the Progress Monitor row registers into (and its meter reads).
        ProgressPlugin.make(),
        ClientPlugin.make({
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
            }),
        }),
        // Contributes the operation handlers the generators invoke (e.g. `SpaceOperation.AddType`).
        SpacePlugin({}),
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

export const Default: Story = {};

// The Progress Monitor row registers a synthetic monitor and renders its own meter — the R0 rail's
// only appears inside a popover, so without this a working monitor looks like a broken one.
export const Progress: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const start = await canvas.findByRole('button', { name: 'Start test progress' }, { timeout: 12_000 });
    await userEvent.click(start);
    await waitFor(() => expect(canvasElement.querySelector('[role="progressbar"]')).toBeTruthy(), { timeout: 5_000 });
    // Cancel leaves the row back in its startable state, with no meter.
    await userEvent.click(await canvas.findByRole('button', { name: 'Cancel test progress' }));
    await waitFor(() => expect(canvasElement.querySelector('[role="progressbar"]')).toBeNull(), { timeout: 5_000 });
  },
};
