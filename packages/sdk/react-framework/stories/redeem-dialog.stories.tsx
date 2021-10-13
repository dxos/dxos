//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import { ClientInitializer } from '@dxos/react-client';

import { FullScreen, RedeemDialog, RedeemDialogWithoutClient } from '../src';

export default {
  title: 'react-framework/RedeemDialog'
};

// TODO(burdon): Replace callbacks with model.

export const Primary = () => {
  const [open, setOpen] = useState(true);
  return (
    <FullScreen>
      <RedeemDialogWithoutClient
        open={open}
        onEnterInvitationCode={async (invitationCode: string) => {
          const match = invitationCode.match(/[a-z]+/g);
          if (!match) {
            return { error: new Error('Invalid code.') };
          }

          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(undefined);
            }, 3000);
          });
        }}
        onEnterPin={(pin: string) => {
          const match = pin.match(/[0-9]+/g);
          if (!match) {
            return { error: new Error('Invalid PIN.') };
          }
        }}
        onClose={() => setOpen(false)}
      />
    </FullScreen>
  );
};

// TODO(burdon): Generate actual invitation code to paste.
export const WithClient = () => {
  return (
    <ClientInitializer>
      <RedeemDialog
        open
        onClose={() => {
          console.log('OK');
        }}
      />
    </ClientInitializer>
  );
};
