//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Tree } from './Tree';

const meta = {
  title: 'devtools/devtools/Tree',
  component: Tree,
} satisfies Meta<typeof Tree>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    return (
      <div>
        <Tree data={JSON.parse(data)} />
      </div>
    );
  },
};

const data =
  '{"runtime":{"client":{"remoteSource":"https://halo.dev.dxos.org/vault.html","storage":{"persistent":true}},"services":{"signaling":[{"server":"wss://kube.dxos.org/.well-known/dx/signal"},{"server":"wss://dev.kube.dxos.org/.well-known/dx/signal"}],"ice":[{"urls":"turn:kube.dxos.org:3478","username":"dxos","credential":"dxos"}],"ipfs":{"server":"http://dx.dev.kube.dxos.org:5001","gateway":"http://dx.dev.kube.dxos.org:8888/ipfs"}},"app":{"env":{"DX_ENVIRONMENT":"development","DX_IPDATA_API_KEY":"ccc5f0cd66dd34a7c31c2ddc61c2bbca2db73892a993982bb3a5f0e2"},"build":{"timestamp":"2023-09-01T19:26:43.561Z","commitHash":"d07039ec3","version":"0.1.56"}}},"version":1,"package":{"modules":[{"name":"labs","type":"dxos:type/app","displayName":"Labs","description":"DXOS Labs Plugins","tags":["showcase"],"build":{"command":"moon run labs-app:bundle"}}]}}';
