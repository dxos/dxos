//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { corePlugins } from '@dxos/plugin-testing';
import { useAsyncEffect } from '@dxos/react-hooks';
import { withLayout } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { DeckStoryPlugin, storyItemId } from '../../testing';
import { DeckLayout } from './DeckLayout';

const meta = {
  title: 'plugins/plugin-deck/containers/DeckLayout',
  component: DeckLayout,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [...corePlugins(), DeckStoryPlugin()],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DeckLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OnePlank: Story = {
  render: () => {
    const { invokePromise } = useOperationInvoker();
    useAsyncEffect(async () => {
      // A singleton `active` list renders fullbleed; opening into a fresh deck yields that directly.
      await invokePromise(LayoutOperation.Open, { subject: [storyItemId(0)], navigation: 'immediate' });
    });

    return <DeckLayout />;
  },
};

export const ManyPlanks: Story = {
  render: () => {
    const { invokePromise } = useOperationInvoker();
    useAsyncEffect(async () => {
      await invokePromise(LayoutOperation.Open, { subject: [storyItemId(0)], navigation: 'immediate' });
      await invokePromise(LayoutOperation.Open, {
        subject: [storyItemId(1)],
        disposition: 'add',
        navigation: 'immediate',
      });
    });

    return <DeckLayout />;
  },
};
