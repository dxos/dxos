//
// Copyright 2022 DXOS.org
//
import { Command, SyncClient, SyncServer } from '@dxos/protocols/proto/dxos/gravity';

import { Client } from './rpcclt';
import { Server, MethodCall, MethodMap, Config, On } from './rpcsrv';

type processCommand = (command: Command) => void;

export const processSyncServer: processCommand = async (command: Command) => {
  const cmd = <SyncServer>command.syncServer;
  const srvMethods: MethodMap = new Map<string, MethodCall>();
  const config: Config = <Config>{ serverName: cmd.id, verbose: true };
  const server = new Server(config, srvMethods);
  await server.start();
  await server.wait();
  await server.stop();
};

export const processSyncClient: processCommand = async (command: Command) => {
  const cmd = <SyncClient>command.syncClient;
  const config: Config = <Config>{ serverName: cmd.to, sync: true, verbose: true };
  const client = new Client(config);
  const res = client
    .command(On.SYNC, true)
    .then((response) => {
      if (response === On.SYNC) {
        return Promise.resolve(true);
      } else {
        return Promise.reject(Error('incorrect response'));
      }
    })
    .catch();
  return res;
};
