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
  title: 'React Framework/RedeemDialog Component',
  component: ReedemDialogStory
};
