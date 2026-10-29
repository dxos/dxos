//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useState } from 'react';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter } from '@dxos/echo';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { FeatureSeed } from '@dxos/plugin-projects/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import * as Button from '@dxos/react-ui/Button';
import * as Layout from '@dxos/react-ui/Layout';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { Feature } from '#types';

import { ObjectAddPicker } from './ObjectAddPicker.tsx';

const DefaultStory = () => {
  const [space] = useSpaces();
  const [picked, setPicked] = useState<string>();
  const [created, setCreated] = useState<string>();
  if (!space) {
    return <Loading data={{ space: !!space }} />;
  }

  return (
    <Layout.Flex column gap='xs' classNames='p-2'>
      <ObjectAddPicker
        db={space.db}
        filter={Filter.type(Feature.Feature)}
        onSelect={setPicked}
        onCreate={setCreated}
        trigger={<Button.Root data-testid='picker'>Add feature</Button.Root>}
      />
      <span data-testid='picked'>{picked}</span>
      <span data-testid='created'>{created}</span>
    </Layout.Flex>
  );
};

const meta = {
  title: 'plugins/plugin-projects/components/ObjectAddPicker',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...CorePlugins.make(),
        ClientPlugin.make({
          types: FeatureSeed.types,
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(async () => {
                FeatureSeed.seed(defaultSpace.db);
                await defaultSpace.db.flush({ indexes: true });
              });
            }),
        }),
        StorybookPlugin.make({}),
      ],
    }),
    withTheme(),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [...reactUiTranslations, ...formTranslations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Lists the space's objects of the type by label; picking one reports its id. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('picker', undefined, { timeout: 10_000 }));
    await userEvent.click(await screen.findByRole('option', { name: /Accounts/ }, { timeout: 5_000 }));
    await waitFor(() => expect(canvas.getByTestId('picked').textContent).not.toBe(''));
  },
};

/** A query that matches nothing offers to create an object by that name. */
export const Create: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('picker', undefined, { timeout: 10_000 }));
    await waitFor(() => expect(document.activeElement?.tagName).toBe('INPUT'));
    await userEvent.keyboard('Offline mode');
    await userEvent.click(
      await screen.findByText(/Offline mode/, { selector: '[role="option"] *' }, { timeout: 5_000 }),
    );
    await userEvent.click(await screen.findByRole('button', { name: /save/i }));
    await waitFor(() => expect(canvas.getByTestId('created')).toHaveTextContent('Offline mode'));
  },
};
