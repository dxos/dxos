//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Module } from '@dxos/protocols/proto/dxos/config';
import { Avatar, Group } from '@dxos/react-uikit';

export interface AppProps {
  module: Module;
  launchUrl: string;
}

// TODO(burdon): Add URL.
export const App = (props: AppProps) => {
  // prettier-ignore
  return (
    <Group
      label={{
        level: 2,
        className: 'text-lg font-body flex gap-2 items-center',
        children: (
          <Avatar
            size={10}
            fallbackValue={props.module.name!}
            label={
              <p>
                {props.module.displayName || props.module.name}
              </p>
            }
          />
        )
      }}
      className='mbe-2'
    >
      <p className='font-mono break-words'>{props.module.description || 'CONFIGURE IN dx.yml'}</p>
      <a target={props.module.name} href={props.launchUrl}>LAUNCH</a>
    </Group>
  );
};
