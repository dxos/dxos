//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { withTheme } from '@dxos/react-ui/testing';
import React, { useMemo } from 'react';

import { useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { DataType } from '@dxos/schema';
import { render } from '@dxos/storybook-utils';

import { translations } from '../../translations';
import { OutlineType } from '../../types';

import { Outliner } from './Outliner';

// TODO(burdon): Can we create a storybook for the Outliner without the database?

const meta = {
  title: 'plugins/plugin-outliner/Outliner',
  component: Outliner,
  render: render(({ text: _text }) => {
    const space = useSpace();
    const text = useMemo(() => space?.db.add(_text), [space, _text]);
    if (text) {
      return <Outliner id={text.id} text={text} />;
    }
  }),
  decorators: [withTheme, withClientProvider({ createIdentity: true, createSpace: true, types: [DataType.Text, OutlineType] })],
  parameters: {
    layout: 'fullscreen',
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
