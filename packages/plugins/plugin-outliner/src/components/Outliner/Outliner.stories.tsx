//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React, { useMemo } from 'react';

import { live, useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { DataType } from '@dxos/schema';
import { render, withLayout, withTheme } from '@dxos/storybook-utils';

import { Outliner } from './Outliner';
import translations from '../../translations';
import { OutlineType } from '../../types';

// TODO(burdon): Can we create a storybook for the Outliner without the database?

const meta: Meta<typeof Outliner> = {
  title: 'plugins/plugin-outliner/Outliner',
  component: Outliner,
  render: render(({ text: _text }) => {
    const space = useSpace();
    const text = useMemo(() => space?.db.add(_text), [space, _text]);
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
};

export default meta;

type Story = StoryObj<typeof Outliner>;

export const Default: Story = {
  args: {
    text: live(DataType.Text, { content: '- [x] Initial content' }),
  },
};
