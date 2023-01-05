//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Module } from '@dxos/protocols/proto/dxos/config';
import { Avatar, Group } from '@dxos/react-ui';

export interface AppProps {
  module: Module;
  launchUrl: string;
}

export const App = (props: AppProps) => {
  // prettier-ignore
  // TODO(burdon): Create link as button on right.
  return (
    <a
      target={props.module.name}
      href={props.launchUrl}
    >
      <Group
        className='mbe-2'
        label={{
          level: 2,
          className: 'text-lg font-body flex gap-2 items-center',
          children: (
            <Avatar
              size={10}
              // TODO(burdon): Add public key to module def.
              fallbackValue={props.module.name!}
              label={
                <p>
                  {props.module.displayName || props.module.name}
                </p>
              }
            />
          )
        }}
      >
        {/* TODO(burdon): Hack to indent left below name. */}
        <p className='text-sm break-words' style={{ paddingLeft: 48 }}>
          {props.module.description || 'Configure in dx.yml config.'}
        </p>
      </Group>
    </a>
  );
};
