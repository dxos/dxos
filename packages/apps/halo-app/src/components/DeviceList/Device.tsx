//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { PublicKey } from '@dxos/keys';
import { HashIcon } from '@dxos/react-components';
import { Group } from '@dxos/react-uikit';

export interface DeviceProps {
  publicKey: PublicKey
  displayName?: string
}

export const Device = (props: DeviceProps) => {
  return (
    <Group label={{
      level: 2,
      className: 'text-lg font-body',
      children: <>
        <HashIcon value={props.publicKey.toHex()} />
        <p>{props.displayName}</p>
      </>
    }}>
      <p className='font-mono break-words'>
        {props.publicKey.toHex()}
      </p>
    </Group>
  );
};
