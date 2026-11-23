//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { RpcTarget, newMessagePortRpcSession } from 'capnweb';
import React, { useCallback } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { GadgetFrame } from './GadgetFrame.tsx';

/** Stands in for a gadget's server: what Cloudflare OS runs in the gadget's Durable Object facet. */
class CounterServer extends RpcTarget {
  #count = 0;

  increment(): number {
    return ++this.#count;
  }
}

/** A gadget UI as Cloudflare OS bundles it: plain script that reaches its server through `gadget`. */
const COUNTER_GADGET = `
document.body.style.cssText = 'font: 16px system-ui; display: grid; place-items: center; height: 100vh; margin: 0';
const button = document.createElement('button');
button.textContent = 'Count: 0';
button.style.cssText = 'font-size: 24px; padding: 12px 24px';
button.onclick = async () => { button.textContent = 'Count: ' + (await gadget.increment()); };
document.body.append(button);
`;

/** Tries the network from inside the frame, which the sandbox's policy must refuse. */
const NETWORK_GADGET = `
document.body.style.font = '16px system-ui';
fetch('https://example.com').then(
  () => { document.body.textContent = 'fetch succeeded'; },
  () => { document.body.textContent = 'fetch blocked'; },
);
`;

const DefaultStory = ({ jsCode }: { jsCode: string }) => {
  const handleConnect = useCallback((port: MessagePort) => {
    newMessagePortRpcSession(port, new CounterServer());
  }, []);

  return <GadgetFrame jsCode={jsCode} title='Counter' onConnect={handleConnect} />;
};

const meta = {
  title: 'plugins/plugin-cloudflare-os/components/GadgetFrame',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { jsCode: COUNTER_GADGET },
};

export const NoNetwork: Story = {
  args: { jsCode: NETWORK_GADGET },
};
