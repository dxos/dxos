//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/react-ui/testing';
import { Text as TextType } from '@dxos/schema';
import { render } from '@dxos/storybook-utils';

import { translations } from '../../translations';
import { Outline } from '../../types';

import { OutlineComponent } from './Outline';

const meta = {
  title: 'plugins/plugin-outliner/Outline',
  component: OutlineComponent,
  render: render(({ text: textParam }) => {
    const space = useSpace();
    const text = useMemo(() => space?.db.add(textParam), [space, textParam]);
    if (text) {
      return <OutlineComponent id={text.id} text={text} />;
    }
  }),
  decorators: [
    withTheme,
    // TODO(burdon): Can we create a storybook for the Outliner without the database?
    withClientProvider({ createIdentity: true, createSpace: true, types: [TextType.Text, Outline.Outline] }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof OutlineComponent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    id: 'outline',
    text: TextType.make('- [x] Initial content'),
  },
};
