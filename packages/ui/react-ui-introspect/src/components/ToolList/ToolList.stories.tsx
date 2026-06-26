//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { TOOL_METADATA } from '@dxos/introspect-tools';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';
import { ToolList } from './ToolList';

const DefaultStory = () => {
  const [selected, setSelected] = useState<string>('list_plugins');
  return <ToolList tools={TOOL_METADATA} selected={selected} onSelect={setSelected} />;
};

const meta: Meta<typeof ToolList> = {
  title: 'ui/react-ui-introspect/ToolList',
  component: ToolList,
  render: () => <DefaultStory />,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'max-w-md' })],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof ToolList>;

export const Default: Story = {};
