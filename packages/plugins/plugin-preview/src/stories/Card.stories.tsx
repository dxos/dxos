//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { faker } from '@dxos/random';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '../translations';

import { Defaultstory, type DefaultstoryProps, createCards } from './testing';

faker.seed(999);

// Wrapper to create cards at render time (ECHO objects can't be created at module load).
const DefaultStoryWithCards = ({ role, image = true }: { role: DefaultstoryProps['role']; image?: boolean }) => {
  const cards = useMemo(() => createCards(image), [image]);
  return <Defaultstory role={role} cards={cards} />;
};

const meta = {
  title: 'plugins/plugin-preview/Card',
  render: DefaultStoryWithCards,
  decorators: [
    withTheme,
    // TODO(wittjosiah): Try to write story which does not depend on plugin manager.
    withPluginManager({ plugins: corePlugins() }),
  ],
  parameters: {
    translations,
  },
  tags: ['cards'],
} satisfies Meta<typeof DefaultStoryWithCards>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Popover: Story = {
  args: {
    role: 'card--popover',
  },
};

export const Intrinsic: Story = {
  args: {
    role: 'card--intrinsic',
  },
};

export const Extrinsic: Story = {
  args: {
    role: 'card--extrinsic',
  },
};

export const ExtrinsicNoImage: Story = {
  args: {
    role: 'card--extrinsic',
    image: false,
  },
};
