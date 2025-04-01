//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useMemo } from 'react';

import { useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { NodeEditor } from './NodeEditor';
import translations from '../../translations';
import { Tree, TreeType } from '../../types';

const meta: Meta<typeof NodeEditor> = {
  title: 'plugins/plugin-outliner/NodeEditor',
  component: NodeEditor,
  render: (args) => {
    const space = useSpace();
    const tree = useMemo(() => {
      if (!space) {
        return null;
      }

      const tree = new Tree();
      tree.root.data.text = 'Hello';
      space.db.add(tree.tree);
      return tree;
    }, [space]);

    return (
      <div className='w-[40rem] border border-divider rounded'>
        {tree && <NodeEditor {...args} tree={tree.tree} node={tree.root} />}
      </div>
    );
  },
  decorators: [
    withClientProvider({ createIdentity: true, createSpace: true, types: [TreeType] }),
    withTheme,
    withLayout({ tooltips: true }),
  ],
  parameters: {
    layout: 'centered',
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof NodeEditor>;

export const Default: Story = {
  args: {},
};
