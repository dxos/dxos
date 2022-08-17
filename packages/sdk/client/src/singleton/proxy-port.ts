//
// Copyright 2022 DXOS.org
//

import { MaybePromise } from '@dxos/util';

import { SingletonMessage } from '../packlets/proto';

export class ProxyPort {
  constructor (private readonly port: MessagePort) {}

  get onmessage () {
    return this.port.onmessage;
  }

  set onmessage (handler: ((event: MessageEvent<SingletonMessage>) => MaybePromise<void>) | null) {
    this.port.onmessage = handler;
  }

  postMessage (message: SingletonMessage) {
    this.port.postMessage(message);
  }
}
