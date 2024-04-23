//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import React, { useEffect, useState } from 'react';

import { create } from '@dxos/echo-schema/schema';
import { registerSignalRuntime } from '@dxos/echo-signals';
import { Button, DensityProvider } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

export default {
  title: 'react-ui-table/Signal-Example',
  args: {},
  decorators: [
    withTheme,
    (Story: any) => (
      <DensityProvider density='fine'>
        <Story />
      </DensityProvider>
    ),
  ],
};

registerSignalRuntime();
const signal = create({ items: [{ name: 'bob' }] });

export const SignalExample = {
  render: () => {
    const [_, forceUpdate] = useState(0);

    useEffect(() => {
      const interval = setInterval(() => {
        console.log('Pushing item');
        signal.items.push({ name: 'alice' });
      }, 500);

      return () => clearInterval(interval);
    }, [signal.items]);

    return (
      <div>
        <Button onClick={() => forceUpdate((v) => (v += 1))}>Force update</Button>
        <div>
          {signal.items.map((item, index) => (
            <div key={index}>{item.name}</div>
          ))}
        </div>
      </div>
    );
  },
};
