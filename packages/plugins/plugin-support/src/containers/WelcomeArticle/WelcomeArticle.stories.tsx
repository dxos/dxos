//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { WelcomeArticle } from './WelcomeArticle';

type DefaultStoryProps = { role: string };

const DefaultStory = ({ role }: DefaultStoryProps) => <WelcomeArticle role={role} />;

const meta = {
  title: 'plugins/plugin-support/containers/WelcomeArticle',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' }), withPluginManager({ plugins: corePlugins() })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    role: 'article',
  },
};
