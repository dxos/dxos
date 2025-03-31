//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React from 'react';

import { createObject, create } from '@dxos/react-client/echo';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { NodeEditor } from './NodeEditor';
import translations from '../../translations';
import { TreeNodeType } from '../../types';

const meta: Meta<typeof NodeEditor> = {
  title: 'plugins/plugin-outliner/NodeEditor',
  component: NodeEditor,
  render: (args) => {
    return (
      <div className='w-[40rem] border border-divider rounded'>
        <NodeEditor {...args} />
      </div>
    );
  },
  decorators: [withTheme, withLayout({ tooltips: true })],
  parameters: {
    layout: 'centered',
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof NodeEditor>;

export const Default: Story = {
  args: {
    node: createObject(create(TreeNodeType, { text: 'Root', children: [] })),
  },
};
