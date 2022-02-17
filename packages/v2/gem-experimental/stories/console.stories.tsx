//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { FullScreen } from '@dxos/gem-core';

import { Console } from '../src';

export default {
  title: 'experimental/console'
};

export const Primary = () => {
  return (
    <FullScreen style={{
      backgroundColor: '#000'
    }}>
      <Console />
    </FullScreen>
  );
};
