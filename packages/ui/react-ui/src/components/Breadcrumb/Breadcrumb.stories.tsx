//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { withTheme } from '../../testing';
import { Button } from '../Buttons';

import { Breadcrumb } from './Breadcrumb';

const DefaultStory = () => {
  return (
    <Breadcrumb.Root aria-label='Breadcrumb'>
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

export default {
  title: 'ui/react-ui-core/Breadcrumb',
  component: Breadcrumb,
  render: DefaultStory,
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
};

export const Default = {
  args: {},
};
