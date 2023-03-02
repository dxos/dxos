//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React, { useRef, useState } from 'react';

import { PublicKey } from '@dxos/client';
import { log } from '@dxos/log';
import { Button } from '@dxos/react-components';

import { ClientSpaceDecorator } from '../testing';
import { withReactor } from './useReactor';
import { useSpace } from './useSpaces';

log.config({ filter: 'ClientContext:debug,ClientSpaceDecorator:debug,useReactor:debug,warn' });

export default {
  title: 'echo/useReactor'
};

export const Test = {
  render: () => {
    return <div>client active</div>;
  },
  decorators: [ClientSpaceDecorator()]
};

export const Default = {
  render: withReactor(({ spaceKey }: { spaceKey: PublicKey }) => {
    const ref = useRef<HTMLElement>(null);
    const space = useSpace(spaceKey);
    console.log(ref.current);

    return (
      <div>
        <Button
          onClick={() => {
            if (!space) {
              return;
            }
            console.log('decrement');
            space.properties.count ??= 0;
            space.properties.count--;
          }}
        >
          -
        </Button>
        <span ref={ref}>{space?.properties.count ?? 0}</span>
        <Button
          onClick={() => {
            if (!space) {
              return;
            }
            console.log('increment');
            space.properties.count ??= 0;
            space.properties.count++;
          }}
        >
          +
        </Button>
      </div>
    );
  }),
  decorators: [ClientSpaceDecorator()]
};

let count = 0;

export const Primitive = {
  render: () => {
    const [, forceUpdate] = useState({});
    console.log('render', count);

    return (
      <>
        <Button
          onClick={() => {
            count--;
            forceUpdate({});
          }}
        >
          -
        </Button>
        <span>{count}</span>
        <Button
          onClick={() => {
            count++;
            forceUpdate({});
          }}
        >
          +
        </Button>
      </>
    );
  }
};
