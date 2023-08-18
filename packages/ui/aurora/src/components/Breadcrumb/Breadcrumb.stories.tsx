//
// Copyright 2023 DXOS.org
//
import '@dxosTheme';
import React from 'react';

import { Breadcrumb } from './Breadcrumb';

const StorybookBreadcrumb = () => {
  return (
    <Breadcrumb.Root aria-label='Breadcrumb'>
      <Breadcrumb.List>
        <Breadcrumb.ListItem>
          <Breadcrumb.Link>Grocery</Breadcrumb.Link>
        </Breadcrumb.ListItem>
        <Breadcrumb.ListItem>
          <Breadcrumb.Link>Produce</Breadcrumb.Link>
        </Breadcrumb.ListItem>
        <Breadcrumb.ListItem>
          <Breadcrumb.Link>Veggies</Breadcrumb.Link>
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
