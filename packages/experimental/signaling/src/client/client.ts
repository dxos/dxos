//
// Copyright 2024 DXOS.org
//

import WebSocket from 'ws';

import { Trigger } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { decodeMessage, encodeMessage, type SignalMessage, type SwarmPayload, type WebRTCPayload } from '../protocol';

export interface SignalingListener {
  onDescription(description: RTCSessionDescription): void;
  onIceCandidate(candidate: RTCIceCandidate): void;
}

/**
 * Signaling client.
 */
// TODO(burdon): Rename Messenger.
export class SignalingClient {
  private readonly _deviceKey = PublicKey.random();
  private _discoveryKey?: PublicKey;
  private _ws?: WebSocket;

  constructor(private readonly _url: string) {}

  public get info() {
    return {
      open: this.isOpen,
    };
  }

  public get isOpen() {
    return !!this._ws;
  }

  public async open(discoveryKey: PublicKey, listener?: SignalingListener): Promise<boolean> {
    invariant(!this._ws);
    log.info('opening', { deviceKey: this._deviceKey });
    const ready = new Trigger<boolean>();

    this._discoveryKey = discoveryKey;
    this._ws = new WebSocket(new URL(`/signaling/ws/${discoveryKey.toHex()}/${this._deviceKey.toHex()}`, this._url));
    Object.assign(this._ws, {
      onopen: () => {
        log.info('opened', { deviceKey: this._deviceKey });
        ready.wake(true);
      },

      onclose: () => {
        log.info('closed', { deviceKey: this._deviceKey });
        ready.wake(false);
      },

      onerror: (event) => {
        log.catch(event.error, { deviceKey: this._deviceKey });
        ready.throw(event.error);
      },

      onmessage: (event) => {
        const message = decodeMessage(event.data);
        log.info('received', { deviceKey: this._deviceKey, message });
        switch (message?.type) {
          case 'update': {
            const { peers } = message.data as SwarmPayload;
            const peer = peers?.find((peer) => peer.peerKey !== this._deviceKey.toHex());
            if (peer) {
              this.send<WebRTCPayload>({
                type: 'rtc',
                data: {
                  from: {
                    discoveryKey: this._discoveryKey!.toHex(),
                    peerKey: this._deviceKey.toHex(),
                  },
                  to: peer,
                },
              });
            }
            break;
          }

          case 'rtc': {
            const {
              from: { peerKey },
            } = message.data as WebRTCPayload;
            // https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation
            const polite = this._deviceKey.toHex() < peerKey;
            log.info('offer', { polite, this: this._deviceKey.toHex(), peerKey });
            break;
          }
        }
      },
    } satisfies Partial<WebSocket>);

    return await ready.wait();
  }

  public async close() {
    if (this._ws) {
      log.info('closing', { deviceKey: this._deviceKey });
      this._ws.close();
      this._ws = undefined;
    }
  }

  // TODO(burdon): to: peer.

  public sendDescription(description: RTCSessionDescription) {
    this.send({
      type: 'rtc',
      data: {
        from: {
          discoveryKey: this._discoveryKey!.toHex(),
          peerKey: this._deviceKey.toHex(),
        },

        description,
      },
    });
  }

  public sendIceCandidate(candidate: RTCIceCandidate) {
    this.send({
      type: 'rtc',
      data: {
        from: {
          discoveryKey: this._discoveryKey!.toHex(),
          peerKey: this._deviceKey.toHex(),
        },

        candidate,
      },
    });
  }

  send<T>(message: SignalMessage<T>) {
    invariant(this._ws);
    log.info('sending', { deviceKey: this._deviceKey, message });
    this._ws.send(encodeMessage<T>(message));
  }
}
