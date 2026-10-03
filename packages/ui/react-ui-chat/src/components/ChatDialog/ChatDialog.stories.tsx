//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Button, Field, Input, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { ChatDialog } from './ChatDialog.tsx';

const items = Array.from({ length: 100 }, (_, i) => `Item ${i}`);

const meta = {
  title: 'ui/react-ui-chat/ChatDialog',
  component: ChatDialog.Root,
  render: (args) => {
    const [open, setOpen] = useState(true);
    const [expanded, setExpanded] = useState(true);
    return (
      <>
        <Toolbar.Root>
          <Button onClick={() => setOpen((open) => !open)}>Open</Button>
          <Button onClick={() => setExpanded((expanded) => !expanded)}>Expand</Button>
        </Toolbar.Root>

        <ChatDialog.Root
          {...args}
          open={open}
          onOpenChange={setOpen}
          expanded={expanded}
          onExpandedChange={setExpanded}
        >
          <ChatDialog.Header title='Chat' />
          <ChatDialog.Content>
            {items.map((item) => (
              <div key={item} className='ps-4 pb-1'>
                {item}
              </div>
            ))}
          </ChatDialog.Content>
          <ChatDialog.Footer classNames='px-2 items-center'>
            <Field.Root>
              <Input classNames='border-none' placeholder='Test' />
            </Field.Root>
          </ChatDialog.Footer>
        </ChatDialog.Root>
      </>
    );
  },
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    translations,
  },
} satisfies Meta<typeof ChatDialog.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
