//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '../../testing/index.ts';
import * as Button from '../Button/Button.tsx';
import * as Breadcrumb from './Breadcrumb.tsx';

const DefaultStory = (props: Breadcrumb.RootProps) => {
  return (
    <div>
      <Breadcrumb.Root {...props}>
        <Breadcrumb.List>
          <Breadcrumb.ListItem>
            <Breadcrumb.Link>
              <Button.Root variant='ghost' classNames='px-0 text-base-fg font-normal'>
                Home
              </Button.Root>
            </Breadcrumb.Link>
            <Breadcrumb.Separator />
          </Breadcrumb.ListItem>
          <Breadcrumb.ListItem>
            <Breadcrumb.Link href='#'>Mailbox</Breadcrumb.Link>
            <Breadcrumb.Separator />
          </Breadcrumb.ListItem>
          <Breadcrumb.ListItem>
            <Breadcrumb.Link href='#'>Work</Breadcrumb.Link>
            <Breadcrumb.Separator />
          </Breadcrumb.ListItem>
          <Breadcrumb.ListItem>
            <Breadcrumb.Current>All</Breadcrumb.Current>
          </Breadcrumb.ListItem>
        </Breadcrumb.List>
      </Breadcrumb.Root>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Breadcrumb',
  component: Breadcrumb.Root as any,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    'aria-label': 'Breadcrumb',
  },
};
