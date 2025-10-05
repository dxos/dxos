//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { Button } from '../Buttons';

import { Breadcrumb, type BreadcrumbRootProps } from './Breadcrumb';

const DefaultStory = (props: BreadcrumbRootProps) => {
  return (
    <Breadcrumb.Root {...props}>
      <Breadcrumb.List>
        <Breadcrumb.ListItem>
          <Breadcrumb.Link asChild>
            <Button variant='ghost' density='fine' classNames='pli-0 text-baseText font-normal'>
              Grocery
            </Button>
          </Breadcrumb.Link>
          <Breadcrumb.Separator />
        </Breadcrumb.ListItem>
        <Breadcrumb.ListItem>
          <Breadcrumb.Link href='#'>Produce</Breadcrumb.Link>
          <Breadcrumb.Separator />
        </Breadcrumb.ListItem>
        <Breadcrumb.ListItem>
          <Breadcrumb.Link href='#'>Veggies</Breadcrumb.Link>
          <Breadcrumb.Separator />
        </Breadcrumb.ListItem>
        <Breadcrumb.ListItem>
          <Breadcrumb.Current>Peppers</Breadcrumb.Current>
        </Breadcrumb.ListItem>
      </Breadcrumb.List>
    </Breadcrumb.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/Breadcrumb',
  component: Breadcrumb.Root as any,
  render: DefaultStory,
  decorators: [withTheme],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    'aria-label': 'Breadcrumb',
  },
};
