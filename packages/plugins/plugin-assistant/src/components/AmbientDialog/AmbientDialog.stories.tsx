//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';
import React, { useState } from 'react';

import { IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Config } from '@dxos/client';
import { faker } from '@dxos/random';
import { withClientProvider } from '@dxos/react-client/testing';
import { Dialog, Toolbar, Button } from '@dxos/react-ui';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { AmbientDialog } from './AmbientDialog';
import translations from '../../translations';

const meta: Meta<typeof AmbientDialog> = {
  title: 'plugins/plugin-assistant/AmbientDialog',
  component: AmbientDialog,
  render: () => {
    const [open, setOpen] = useState(true);
    const [items, setItems] = useState<string[]>([]);
    return (
      <>
        <div>
          <Toolbar.Root>
            <Toolbar.Button onClick={() => setOpen(true)}>Open</Toolbar.Button>
          </Toolbar.Root>
        </div>
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <AmbientDialog>
            <div className='flex flex-col h-full overflow-hidden'>
              <div className='flex flex-col h-full gap-2 overflow-auto'>
                {items.map((item) => (
                  <div key={item} className='px-2'>
                    {item}
                  </div>
                ))}
                {items.length > 0 && <div className='pbe-2' />}
              </div>
              <div className='shrink-0 h-[40px]'>
                <Button onClick={() => setItems([...items, faker.lorem.word()])}>Add</Button>
              </div>
            </div>
          </AmbientDialog>
        </Dialog.Root>
      </>
    );
  },
  decorators: [
    // TODO(burdon): Replace with ClientPlugin.
    withClientProvider({
      config: new Config({
        runtime: {
          client: { edgeFeatures: { signaling: true } },
          services: {
            edge: { url: 'https://edge.dxos.workers.dev/' },
            iceProviders: [{ urls: 'https://edge.dxos.workers.dev/ice' }],
          },
        },
      }),
      createIdentity: true,
      createSpace: true,
    }),
    withPluginManager({
      plugins: [IntentPlugin()],
    }),
    withTheme,
    withLayout({ fullscreen: true }),
  ],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof AmbientDialog>;

export const Default: Story = {};
