//
// Copyright 2022 DXOS.org
//

import ipc from 'node-ipc';

import { Config } from './rpcsrv';

enum On {
  CONNECT = 'connect',
  ERROR = 'error',
  DISCONNECT = 'disconnect'
}

export class Client {
  constructor(config: Config) {
    ipc.config.id = config.id;
    ipc.config.networkHost = config.host;
    ipc.config.networkPort = config.port;
    ipc.config.stopRetrying = true;
    ipc.config.silent = config.verbose ? !config.verbose : true;
    ipc.config.logInColor = true;
  }

  async call(method: string, input: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const serverName = ipc.config.id;

      ipc.connectToNet(ipc.config.id, ipc.config.networkHost, ipc.config.networkPort, () => {
        const server = ipc.of[serverName];
        server.on(On.CONNECT, () => {
          server.emit(method, input);
        });

        server.on(method, ({ error, response }) => {
          // ipc.log(`${serverName}@${method}:response`, error, response);
          ipc.disconnect(serverName);
          resolve(response);
        });

        server.on(On.ERROR, (err) => {
          // ipc.log('Synchronization error:', { err });
          reject(err);
        });

        server.on(On.DISCONNECT, (...args) => {
          // ipc.log('Synchronization disconnect:', args);
        });
      });
    });
  }
}
