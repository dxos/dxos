//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { FullScreen } from '@dxos/react-components';

import { EchoTable, Layout } from '../src';

export default {
  title: 'KitchenSink/Layout'
};

export const Primary = () => {
  return (
    <FullScreen>
      <Layout>
        <EchoTable />
      </Layout>
    </FullScreen>
  );
};
