//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { DeckStoryPlugin, STORY_ITEMS } from '@dxos/plugin-deck/testing';
import { translations as deckTranslations } from '@dxos/plugin-deck/translations';
import { corePlugins } from '@dxos/plugin-testing';
import { useAsyncEffect } from '@dxos/react-hooks';
import { withLayout } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { WithKeyboard } from '../../testing';
import { MobileDeckLayout } from './MobileDeckLayout';

/**
 * The drawer opens from the navbar's companion tabs, and the keyboard from focusing any text input;
 * both drive the splitter, which is what this story is for.
 */
const DefaultStory = () => (
  <WithKeyboard>
    <MobileDeckLayout />
  </WithKeyboard>
);

const meta = {
  title: 'plugins/plugin-mobile/containers/MobileDeckLayout',
  component: MobileDeckLayout,
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [...corePlugins(), DeckStoryPlugin()],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    // The deck owns the dialog/popover/toast overlays this layout renders, so its namespace has to
    // be registered alongside the mobile one.
    translations: [...deckTranslations, ...translations],
  },
} satisfies Meta<typeof MobileDeckLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  tags: ['test'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // The app bar and the navbar are the chrome the layout owns; the drawer contributes its own toolbar.
    await expect(await canvas.findByRole('banner')).toBeInTheDocument();
    await expect((await canvas.findAllByRole('toolbar')).length).toBeGreaterThan(0);
  },
};

export const OnePanel: Story = {
  render: () => {
    const { invokePromise } = useOperationInvoker();
    useAsyncEffect(async () => {
      await invokePromise(LayoutOperation.Open, { subject: [STORY_ITEMS[0].id], navigation: 'immediate' });
    });

    return <DefaultStory />;
  },
};

export const Stack: Story = {
  render: () => {
    const { invokePromise } = useOperationInvoker();
    useAsyncEffect(async () => {
      await invokePromise(LayoutOperation.Open, { subject: [STORY_ITEMS[0].id], navigation: 'immediate' });
      await invokePromise(LayoutOperation.Open, {
        subject: [STORY_ITEMS[1].id],
        disposition: 'add',
        navigation: 'immediate',
      });
    });

    return <DefaultStory />;
  },
};
