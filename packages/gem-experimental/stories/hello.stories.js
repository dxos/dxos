//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { withKnobs } from '@storybook/addon-knobs';

import { FullScreen } from '@dxos/gem-core';

import { Hello } from '../src';

export default {
  title: 'Experimental:Hello',
  decorators: [withKnobs]
};

export const withHello = () => {
  return (
    <FullScreen>
      <Hello />
    </FullScreen>
  );
};
