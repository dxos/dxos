//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { PublicKey } from '@dxos/keys';
import { Avatar, Group } from '@dxos/react-uikit';

export interface DeviceProps {
  publicKey: PublicKey;
  displayName?: string;
}

export const Device = (props: DeviceProps) => {
  return (
    <Group
      label={{
        level: 2,
        className: 'text-lg font-body flex gap-2 items-center',
        children: (
          <Avatar
            size={10}
            fallbackValue={props.publicKey.toHex()}
            label={<p>{props.displayName}</p>}
          />
        )
      }}
    >
      <p className='font-mono break-words'>{props.publicKey.toHex()}</p>
    </Group>
  );
};
