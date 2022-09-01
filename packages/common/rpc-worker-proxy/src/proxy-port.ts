//
// Copyright 2022 DXOS.org
//

import { MaybePromise } from '@dxos/util';

import { SingletonMessage } from './proto';

/**
 * Wrapper around a MessagePort for sending/receiving SingletonMessages.
 */
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
