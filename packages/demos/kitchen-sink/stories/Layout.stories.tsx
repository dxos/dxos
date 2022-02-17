//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { FullScreen } from '@dxos/react-components';

import { EchoGraph, EchoTable, Layout } from '../src';

export default {
  title: 'KitchenSink/Layout'
};

export const Primary = () => {
  return (
    <FullScreen>
      <Layout
        sidebar={<EchoTable />}
      >
        <EchoGraph />
      </Layout>
    </FullScreen>
  );
};
