//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { DataType } from '@dxos/schema';
import { render, withLayout, withTheme } from '@dxos/storybook-utils';

import { translations } from '../../translations';
import { OutlineType } from '../../types';

import { Outliner } from './Outliner';

// TODO(burdon): Can we create a storybook for the Outliner without the database?

const meta = {
  title: 'plugins/plugin-outliner/Outliner',
  component: Outliner,
  render: render(({ text: textParam }) => {
    const space = useSpace();
    const text = useMemo(() => space?.db.add(textParam), [space, textParam]);
    if (text) {
      return <Outliner id={text.id} text={text} />;
    }
  }),
  decorators: [
    withClientProvider({ createIdentity: true, createSpace: true, types: [DataType.Text, OutlineType] }),
    withTheme,
    withLayout({ fullscreen: true }),
  ],
  parameters: {
    translations,
  },
} satisfies Meta<typeof Outliner>;

export default meta;

type Story = StoryObj<typeof Outliner>;

export const Default: Story = {
  args: {
    text: DataType.makeText('- [x] Initial content'),
  },
};
