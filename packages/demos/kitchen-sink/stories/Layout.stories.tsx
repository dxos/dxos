//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { FullScreen } from '@dxos/react-components';

import { EchoGraph, Layout } from '../src';

export default {
  title: 'KitchenSink/Layout'
};

export const Primary = () => {
  return (
    <FullScreen>
      <Layout>
        <EchoGraph />
      </Layout>
    </FullScreen>
  );
};
