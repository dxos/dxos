//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import * as BrainInspection from '../../brain/BrainInspection.ts';
import { BrainStore, type BrainStoreView } from './BrainStore.tsx';
import { label, makeSnapshot } from './testing.ts';

type StoryProps = {
  defaultView?: BrainStoreView;
  state?: 'loaded' | 'empty' | 'loading' | 'error';
};

const DefaultStory = ({ defaultView, state = 'loaded' }: StoryProps) => {
  // Built in render, since storybook clones args and the fixture's refs hold ECHO objects.
  const inspection = useMemo(
    () =>
      state === 'loaded'
        ? BrainInspection.make(makeSnapshot(), { label })
        : state === 'empty'
          ? BrainInspection.make({ facts: [], subscriptions: [] })
          : undefined,
    [state],
  );
  return (
    <BrainStore
      defaultView={defaultView}
      inspection={inspection}
      error={state === 'error' ? 'BrainError: unknown operation' : undefined}
    />
  );
};

const meta = {
  title: 'plugins/plugin-agent/components/BrainStore',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Facts: Story = {
  args: { defaultView: 'facts' },
};

export const Rules: Story = {
  args: { defaultView: 'rules' },
};

export const MatchingFormat: Story = {
  args: { defaultView: 'encoding' },
};

export const Outbox: Story = {
  args: { defaultView: 'outbox' },
};

export const Empty: Story = {
  args: { state: 'empty', defaultView: 'outbox' },
};

export const Loading: Story = {
  args: { state: 'loading' },
};

export const Failed: Story = {
  args: { state: 'error' },
};
