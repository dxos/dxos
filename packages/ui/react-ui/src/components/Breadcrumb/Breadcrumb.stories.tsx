//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '../../testing';
import { Button } from '../Button';
import { Breadcrumb, type BreadcrumbRootProps } from './Breadcrumb';

const DefaultStory = (props: BreadcrumbRootProps) => {
  return (
    <div>
      <Breadcrumb.Root {...props}>
        <Breadcrumb.List>
          <Breadcrumb.ListItem>
            <Breadcrumb.Link>
              <Button variant='ghost' classNames='px-0 text-base-fg font-normal'>
                Home
              </Button>
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
