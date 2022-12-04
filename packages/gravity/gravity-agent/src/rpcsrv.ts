//
// Copyright 2022 DXOS.org
//

import ipc from 'node-ipc';

import { Trigger } from '@dxos/async';

export type MethodCallback = (err: any, output: any) => void;

export type MethodCall = (input: any, cb?: MethodCallback) => void;

export type MethodMap = Map<string, MethodCall>;

export type Config = {
  serverName: string;
  sync?: boolean;
  verbose?: boolean;
};

enum Stage {
  STARTING = 'STARTING',
  STARTED = 'STARTED',
  STOPPING = 'STOPPING',
  STOPPED = 'STOPPED',
  DONE = 'DONE'
}

export enum On {
  START = 'start',
  DONE = 'done',
  SYNC = 'sync',
  STOP = 'stop'
}

export class Server {
  trigger: Trigger;
  constructor(config: Config, methods: MethodMap) {
    // setup config
    ipc.config.id = config.serverName;
    ipc.config.silent = !config.verbose;
    ipc.config.logInColor = true;
    ipc.config.sync = config.sync ? config.sync : true;
    this.trigger = new Trigger();
    ipc.serve(() => {
      ipc.log(Stage.STARTING);
      ipc.log(`Synchronization ${Stage.STARTED}`);
    });

    ipc.server.on(On.SYNC, (input, socket) => {
      ipc.server.emit(socket, On.SYNC, { response: On.SYNC });
      this.trigger.wake();
    });

    ipc.server.on(On.STOP, () => {
      ipc.log(On.STOP);
      ipc.log(`Synchronization ${Stage.STOPPED}`);
    });

    ipc.server.on(On.DONE, (input, socket) => {
      ipc.log(Stage.STOPPING);
      ipc.server.emit(socket, On.DONE, { response: Stage.DONE });
      ipc.server.stop();
      ipc.log(Stage.STOPPED);
    });

    methods.forEach((methodCall: MethodCall, methodName: string) => {
      ipc.log('register', methodName);
      ipc.server.on(methodName, (input, socket) => {
        ipc.log('server:', methodName, input);
        methodCall(input, (error, output) => {
          ipc.server.emit(socket, methodName, { error, response: output });
        });
        this.trigger.wake();
      });
    });
  }

  wait(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      void this.trigger
        .wait()
        .then(() => {
          resolve(true);
        })
        .catch();
    });
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      ipc.server.start();
      ipc.server.on(On.START, () => {
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      ipc.log(`Synchronization ${Stage.STOPPED}`);
      ipc.server.stop();
      resolve();
    });
  }
}
