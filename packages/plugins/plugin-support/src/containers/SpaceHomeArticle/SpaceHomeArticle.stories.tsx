//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { SPACE_HOME_SUBJECT_PREFIX } from '../../constants';
import { SpaceHomeArticle } from './SpaceHomeArticle';

/** Renders SpaceHomeArticle for the first available space. */
const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[0];
  if (!space) {
    return null;
  }
  const subject = `${SPACE_HOME_SUBJECT_PREFIX}${space.id}`;
  return <SpaceHomeArticle role='article' subject={subject} />;
};

const meta = {
  title: 'plugins/plugin-support/containers/SpaceHomeArticle',
  component: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({ createIdentity: true, createSpace: true }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Personal space: shows Welcome panel (carousel + Start tour + Hide) at the top. */
export const Default: Story = {};
