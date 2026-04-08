//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { translations } from '../../translations';
import { Outline } from '#types';

import { OutlineContainer } from './OutlineContainer';

const DefaultStory = () => {
  const space = useSpace();
  const outline = useMemo(() => {
    if (space) {
      return space.db.add(Outline.make({ content: '- Item 1\n- Item 2\n- Item 3' }));
    }
    return undefined;
  }, [space]);

  if (!outline) {
    return null;
  }

  return <OutlineContainer role='article' subject={outline} attendableId='story' />;
};

const EmptyStory = () => {
  const space = useSpace();
  const outline = useMemo(() => {
    if (space) {
      return space.db.add(Outline.make());
    }
    return undefined;
  }, [space]);

  if (!outline) {
    return null;
  }

  return <OutlineContainer role='article' subject={outline} attendableId='story' />;
};

const meta = {
  title: 'plugins/plugin-outliner/containers/OutlineContainer',
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [Text.Text, Outline.Outline],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <DefaultStory />,
};

export const Empty: Story = {
  render: () => <EmptyStory />,
};
