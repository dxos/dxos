//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { ClientInitializer } from '@dxos/react-client';

import { RedeemDialog } from '../src';

export default {
  title: 'react-framework/RedeemDialog'
};

// TODO(burdon): Remove dependency on client.

export const Primary = () => {
  return (
    <ClientInitializer>
      <RedeemDialog onClose={() => null} />
    </ClientInitializer>
  );
};

export const Pinless = () => {
  return (
    <ClientInitializer>
      <RedeemDialog pinless onClose={() => null} />
    </ClientInitializer>
  );
};
