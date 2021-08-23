//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { ClientInitializer } from '@dxos/react-client';

import RedeemDialog from '../src/containers/RedeemDialog';
export const PinlessReedemDialogStory = () => {
  return (
    <ClientInitializer>
      <RedeemDialog pinless onClose={() => null} />
    </ClientInitializer>
  );
};

export default {
  title: 'React Framework/PinlessRedeemDialog Component',
  component: PinlessReedemDialogStory
};
