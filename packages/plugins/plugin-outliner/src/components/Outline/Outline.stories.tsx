//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withTheme() } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { translations } from '../../translations';
import { Outline } from '../../types';

import { Outline as OutlineComponent } from './Outline';

// TODO(wittjosiah): ECHO objects don't work when passed via Storybook args.
const OutlineStory = () => {
  const space = useSpace();
  const text = useMemo(() => {
    if (space) {
      return space.db.add(Text.make('- [x] Initial content'));
    }
    return undefined;
  }, [space]);
  if (text) {
    return <OutlineComponent id={text.id} text={text} />;
  }
  return null;
};

const meta = {
  title: 'plugins/plugin-outliner/Outline',
  component: OutlineStory,
  decorators: [
    withTheme(),
    // TODO(burdon): Can we create a storybook for the Outliner without the database?
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
} satisfies Meta<typeof OutlineStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
