//
// Copyright 2022 DXOS.org
//

import debug from 'debug';

import { PublicKey } from '@dxos/protocols';

import { Any } from './proto/gen/google/protobuf';
import { SignalManager } from './signal-manager';
import { Message } from './signal-methods';

const log = debug('dxos:signaling:messenger');

export type OnMessage = (params: {
  author: PublicKey
  recipient: PublicKey
  payload: Any
}) => Promise<void>;

export interface MessengerOptions {
  signalManager: SignalManager
}

export class Messenger {
  private readonly _signalManager: SignalManager;
  private readonly _listeners = new Map<string, Set<OnMessage>>();
  private readonly _defaultListeners = new Set<OnMessage>();

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

  /**
   * Subscribes onMessage function to messages that contains payload with payloadType.
   * @param payloadType if not specified, onMessage will be subscribed to all types of messages.
   */
  listen ({
    payloadType,
    onMessage
  }: {
    payloadType?: string
    onMessage: OnMessage
  }): ListeningHandle {
    if (!payloadType) {
      this._defaultListeners.add(onMessage);
    } else {
      if (this._listeners.has(payloadType)) {
        this._listeners.get(payloadType)!.add(onMessage);
      } else {
        this._listeners.set(payloadType, new Set([onMessage]));
      }
    }

    return {
      unsubscribe: async () => {
        if (!payloadType) {
          this._defaultListeners.delete(onMessage);
        } else {
          this._listeners.get(payloadType)?.delete(onMessage);
        }
      }
    };
  }

  private async _handleMessage (message: Message): Promise<void> {
    for (const listener of this._defaultListeners.values()) {
      await listener(message);
    }
    if (this._listeners.has(message.payload.type_url)) {
      for (const listener of this._listeners.get(message.payload.type_url)!) {
        await listener(message);
      }
    }
  }
}

export interface ListeningHandle {
  unsubscribe: () => Promise<void>
}
