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
  private readonly _listeners = new Map<string, Set<Listener>>();
  private readonly _defaultListeners = new Set<Listener>();

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
    if (!payloadType) {
      this._defaultListeners.add(listener);
    } else {
      if (this._listeners.has(payloadType)) {
        this._listeners.get(payloadType)!.add(listener);
      } else {
        this._listeners.set(payloadType, new Set([listener]));
      }
    }

    return {
      unsubscribe: () => {
        if (!payloadType) {
          this._defaultListeners.delete(listener);
        } else {
          this._listeners.get(payloadType)?.delete(listener);
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
