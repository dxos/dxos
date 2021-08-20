//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { ClientInitializer } from '@dxos/react-client';

import RedeemDialog from '../src/components/RedeemDialog';

export const ReedemDialogStory = () => {
  return (
    <ClientInitializer>
      <RedeemDialog onClose={() => null} />
    </ClientInitializer>
  );
};

export default {
  title: 'RedeemDialog Component',
  component: ReedemDialogStory
};
