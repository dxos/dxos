//
// Copyright 2023 DXOS.org
//

import React, { useRef, useState } from 'react';

import { PublicKey } from '@dxos/client';
import { Button } from '@dxos/react-components';

import { ClientSpaceDecorator } from '../testing';
import { withReactor } from './useReactor';
import { useSpace } from './useSpaces';

export default {
  title: 'echo/useReactor'
};

export const Default = {
  render: withReactor(({ spaceKey }: { spaceKey: PublicKey }) => {
    const ref = useRef<HTMLElement>(null);
    const space = useSpace(spaceKey);
    console.log('render', space?.properties.count);
    console.log({ ref });

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
