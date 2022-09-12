//
// Copyright 2022 DXOS.org
//

import debug from 'debug';

import { PublicKey } from '@dxos/protocols';

import { Any } from './proto/gen/google/protobuf';
import { SignalManager } from './signal-manager';

const log = debug('dxos:signaling:messenger');

type Listener = ({
  author,
  recipient,
  payload
}: {
  author: PublicKey
  recipient: PublicKey
  payload: Any
}) => any;

interface MessengerOptions {
  signalManager: SignalManager
}
export class Messenger {
  private readonly _signalManager: SignalManager;
  private readonly _listeners = new Map<string, Map<number, Listener>>();
  private _listenerIndex = 0;

  constructor ({ signalManager }: MessengerOptions) {
    this._signalManager = signalManager;
    this._signalManager.onMessage.on(async (message) => {
      log(`Received message from ${message.author}`);
      await this._handleMessage(message);
    });
  }

  // TODO(mykola): make reliable.
  async message ({ author, recipient, payload }: Message): Promise<void> {
    await this._signalManager.message(author, recipient, payload);
  }

  listen ({
    payloadType,
    listener
  }: {
    payloadType?: string
    listener: Listener
  }): ListeningHandle {
    const firstKey = payloadType ?? '';
    const secondKey = this._listenerIndex++;
    if (this._listeners.has(firstKey)) {
      this._listeners.get(firstKey)?.set(secondKey, listener);
    } else {
      this._listeners.set(firstKey, new Map([[secondKey, listener]]));
    }

    return {
      unsubscribe: () => {
        this._listeners.get(firstKey)?.delete(secondKey);
      }
    };
  }

  private async _handleMessage (message: Message): Promise<void> {
    if (this._listeners.has('')) {
      [...this._listeners.get('')!.values()].forEach((listener) =>
        listener(message)
      );
    }
    if (this._listeners.has(message.payload.type_url)) {
      [...this._listeners.get(message.payload.type_url)!.values()].forEach(
        (listener) => listener(message)
      );
    }
  }
}

export interface ListeningHandle {
  unsubscribe: () => any
}

export interface Message {
  author: PublicKey
  recipient: PublicKey
  payload: Any
}
