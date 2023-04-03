//
// Copyright 2023 DXOS.org
//

import React from 'react';

import '@dxosTheme';
import { InvitationEmoji } from './InvitationEmoji';

export default {
  component: InvitationEmoji,
  actions: { argTypesRegex: '^on.*' }
};

export const Default = (props: any) => {
  return (
    <div className='flex flex-row gap-3 w-full flex-wrap'>
      {new Array(256).fill(0).map((_x, i) => (
        <InvitationEmoji key={i} invitationId={i + 1} {...props} />
      ))}
    </div>
  );
};
