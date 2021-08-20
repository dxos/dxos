//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { ClientInitializer } from '@dxos/react-client';

import RedeemDialog from '../src/components/RedeemDialog';
export const PinlessReedemDialogStory = () => {
  return (
    <ClientInitializer>
      <RedeemDialog pinless onClose={() => null} />
    </ClientInitializer>
  );
};

export default {
  title: 'PinlessRedeemDialog Component',
  component: PinlessReedemDialogStory
};
