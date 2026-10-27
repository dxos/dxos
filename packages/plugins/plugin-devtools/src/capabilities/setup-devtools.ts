//
// Copyright 2025 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Runtime_Client_StorageSchema } from '@dxos/protocols/buf/dxos/config_pb';
import { type Client } from '@dxos/react-client';

const setupDevtools = () => {
  (globalThis as any).composer ??= {};

  // Used to test how composer handles breaking protocol changes.
  (globalThis as any).composer.changeStorageVersionInMetadata = async (version: number) => {
    const { changeStorageVersionInMetadata } = await import('@dxos/client-services/testing');
    const { Storage } = await import('@dxos/client-services');
    const client: Client = (window as any).dxos.client;
    const config = client.config;
    await client.destroy();
    const { storage } = Storage.createStorageObjects(
      config.values?.runtime?.client?.storage ?? create(Runtime_Client_StorageSchema, {}),
    );
    await changeStorageVersionInMetadata(storage, version);
    location.pathname = '/';
  };
};

export default Capability.makeModule(() =>
  Effect.sync(() => {
    setupDevtools();
    return [];
  }),
);
