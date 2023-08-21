//
// Copyright 2023 DXOS.org
//
import '@dxosTheme';
import React from 'react';

import { Button } from '../Buttons';
import { Breadcrumb } from './Breadcrumb';

const StorybookBreadcrumb = () => {
  return (
    <Breadcrumb.Root aria-label='Breadcrumb'>
      <Breadcrumb.List>
        <Breadcrumb.ListItem>
          <Breadcrumb.Link asChild>
            <Button variant='ghost' density='fine' classNames='pli-0 text-base font-normal'>
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
  component: StorybookBreadcrumb,
};

export const Default = {
  args: {},
};
