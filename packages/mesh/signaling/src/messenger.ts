//
// Copyright 2022 DXOS.org
//

import debug from 'debug';

import { PublicKey } from '@dxos/protocols';

import { Any } from './proto/gen/google/protobuf';
import { SignalManager } from './signal-manager';
import { Message } from './signal-methods';

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
  private readonly _defaultListeners = new Map<number, Listener>();
  private _listenerIndex = 0;

  constructor ({ signalManager }: MessengerOptions) {
    this._signalManager = signalManager;
    this._signalManager.onMessage.on(async (message) => {
      log(`Received message from ${message.author}`);
      await this._handleMessage(message);
    });
  }

  // TODO(mykola): make reliable.
  async sendMessage (msg: Message): Promise<void> {
    await this._signalManager.sendMessage(msg);
  }

  listen ({
    payloadType,
    listener
  }: {
    payloadType?: string
    listener: Listener
  }): ListeningHandle {
    const index = this._listenerIndex++;
    if (!payloadType) {
      this._defaultListeners.set(index, listener);
    } else {
      if (this._listeners.has(payloadType)) {
        this._listeners.get(payloadType)?.set(index, listener);
      } else {
        this._listeners.set(payloadType, new Map([[index, listener]]));
      }
    }

    return {
      unsubscribe: () => {
        if (!payloadType) {
          this._defaultListeners.delete(index);
        } else {
          this._listeners.get(payloadType)?.delete(index);
        }
      }
    };
  }

  private async _handleMessage (message: Message): Promise<void> {
    [...this._defaultListeners.values()].forEach((listener) =>
      listener(message)
    );
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
