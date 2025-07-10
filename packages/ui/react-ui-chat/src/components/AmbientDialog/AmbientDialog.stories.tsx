//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Input, Toolbar } from '@dxos/react-ui';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { AmbientDialog } from './AmbientDialog';
import { translations } from '../../translations';

const meta: Meta<typeof AmbientDialog.Root> = {
  title: 'plugins/react-ui-chat/AmbientDialog',
  component: AmbientDialog.Root,
  render: (args) => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Toolbar.Root classNames='_is-full'>
          <Toolbar.Button onClick={() => setOpen(true)}>Open</Toolbar.Button>
        </Toolbar.Root>

        <AmbientDialog.Root {...args} open={open} onOpenChange={setOpen}>
          <div>Hello</div>
          <Input.Root>
            <Input.TextInput placeholder='Test' />
          </Input.Root>
        </AmbientDialog.Root>
      </>
    );
  },
  decorators: [withTheme, withLayout({ fullscreen: true, classNames: 'flex flex-col' })],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof AmbientDialog.Root>;

export const Default: Story = {
  args: {
    title: 'Test',
  },
};
