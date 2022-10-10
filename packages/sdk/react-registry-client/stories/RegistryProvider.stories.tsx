//
// Copyright 2021 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { ConfigProto } from '@dxos/config';
import { MemoryRegistryClientBackend, RegistryClient, RegistryType } from '@dxos/registry-client';

import { RegistryProvider, useRegistry } from '../src/index.js';

export default {
  title: 'react-registry-client/RegistryProvider'
};

const TestApp = () => {
  const registry = useRegistry();
  const [types, setTypes] = useState<RegistryType[]>([]);

  useEffect(() => {
    setImmediate(async () => {
      const types = await registry.listTypeRecords();
      setTypes(types);
    });
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 8 }}>Domains</div>
      {types.length > 0 && types.map(({ type: { messageName } }) => (
        <div key={messageName}>
          {messageName}
        </div>
      ))}
      {types.length === 0 && (
        <div>Loading...</div>
      )}
    </div>
  );
};

export const Memory = () => {
  const registry = new RegistryClient(new MemoryRegistryClientBackend());

  return (
    <RegistryProvider registry={registry}>
      <TestApp />
    </RegistryProvider>
  );
};

export const Testnet = () => {
  const config: ConfigProto = {
    runtime: {
      services: {
        dxns: {
          server: 'wss://dxns1.kube.dxos.network/dxns/ws'
        }
      }
    }
  };

  return (
    <RegistryProvider config={config}>
      <TestApp />
    </RegistryProvider>
  );
};
