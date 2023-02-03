//
// Copyright 2023 DXOS.org
//

import React from 'react';

import '@dxosTheme';

import { Plexus } from './Plexus';

export default {
  component: Plexus,
  argTypes: {}
};

const Test = () => {
  return (
    <div className='flex absolute left-0 right-0 top-0 bottom-0'>
      <Plexus />
    </div>
  );
};

export const Default = {
  render: () => <Test />
};
