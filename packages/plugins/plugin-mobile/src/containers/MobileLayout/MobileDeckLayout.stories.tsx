//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { DeckStoryPlugin, storyItemId } from '@dxos/plugin-deck/testing';
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

/** Opens the given story items as the navigation stack, top-most last. */
const OpenStory = ({ items }: { items: string[] }) => {
  const { invokePromise } = useOperationInvoker();
  useAsyncEffect(async () => {
    for (const [index, subject] of items.entries()) {
      await invokePromise(LayoutOperation.Open, {
        subject: [subject],
        ...(index > 0 && { disposition: 'add' }),
        navigation: 'immediate',
      });
    }
  });

  return <DefaultStory />;
};

export const OnePanel: Story = {
  render: () => <OpenStory items={[storyItemId(0)]} />,
};

/**
 * The drawer's tab strip and its body are resolved separately — the tabs come from the panel's companion
 * nodes while the body is a Surface — so a tab can render over an empty body. This asserts both.
 */
export const Companion: Story = {
  tags: ['test'],
  render: () => <OpenStory items={[storyItemId(0)]} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // The plugin manager activates asynchronously, so the panel mounts well after the story's first paint.
    // Both the navbar and the drawer toolbar carry the tabs; opening from the navbar is the app's path.
    const [tab] = await canvas.findAllByRole('button', { name: 'Companion Beta' }, { timeout: 30_000 });
    await userEvent.click(tab);

    await waitFor(async () => {
      const bodies = canvasElement.querySelectorAll<HTMLElement>('[data-testid="story.companion"]');
      await expect(Array.from(bodies).map((body) => body.dataset.companionVariant)).toContain('beta');
    });
    await expect(canvas.queryByText('Nothing to show here.')).toBeNull();
  },
};

export const Stack: Story = {
  render: () => <OpenStory items={[storyItemId(0), storyItemId(1)]} />,
};
