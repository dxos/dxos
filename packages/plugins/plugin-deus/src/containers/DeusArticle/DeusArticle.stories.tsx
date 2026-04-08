//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import CHESS_1_MDL from '../../../docs/examples/chess-1.mdl?raw';

import { translations } from '../../translations';
import { Spec } from '#types';

import { DeusArticle } from './DeusArticle';

type DefaultStoryProps = { content?: string };

const DefaultStory = ({ content }: DefaultStoryProps) => {
  const spec = useMemo(() => Spec.make({ content }), [content]);
  return <DeusArticle role='article' subject={spec} />;
};

const meta = {
  title: 'plugins/plugin-deus/containers/DeusArticle',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' }), withClientProvider({ createIdentity: true })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Chess1: Story = {
  args: {
    content: CHESS_1_MDL,
  },
};
