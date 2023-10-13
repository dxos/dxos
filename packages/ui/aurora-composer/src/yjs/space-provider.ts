//
// Copyright 2023 DXOS.org
//

import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';
import { Observable } from 'lib0/observable';
import * as awarenessProtocol from 'y-protocols/awareness';
import { type Doc } from 'yjs';

import { log } from '@dxos/log';
import { type Space } from '@dxos/react-client/echo';
import { type GossipMessage } from '@dxos/react-client/mesh';

type Awareness = awarenessProtocol.Awareness;

// Based on https://github.com/yjs/y-webrtc/blob/88baab2/src/y-webrtc.js.

const messageAwareness = 1;
const messageQueryAwareness = 3;

/**
 * Yjs awareness provider on top of a DXOS space.
 */
export class SpaceAwarenessProvider extends Observable<any> {
  private readonly _space: Space;
  private readonly _awareness: Awareness;
  private readonly _clientId: number;
  private readonly _channel: string;

  constructor({ space, doc, channel, awareness }: { space: Space; doc: Doc; channel: string; awareness?: Awareness }) {
    super();
    this._space = space;
    this._awareness = awareness ?? new awarenessProtocol.Awareness(doc);
    this._channel = channel;
    this._clientId = doc.clientID;

    this._awareness.on('update', this._handleAwarenessUpdate.bind(this));
    this._space.listen(this._channel, this._handleSpaceMessage.bind(this));

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this._handleBeforeUnload.bind(this));
    } else if (typeof process !== 'undefined') {
      process.on('exit', this._handleBeforeUnload.bind(this));
    }

    // Post queryAwareness.
    const encoderAwarenessQuery = encoding.createEncoder();
    encoding.writeVarUint(encoderAwarenessQuery, messageQueryAwareness);
    void this._space.postMessage(this._channel, encoding.toUint8Array(encoderAwarenessQuery));

    // Post local awareness state.
    const encoderAwarenessState = encoding.createEncoder();
    encoding.writeVarUint(encoderAwarenessState, messageAwareness);
    encoding.writeVarUint8Array(
      encoderAwarenessState,
      awarenessProtocol.encodeAwarenessUpdate(this.awareness, [this._clientId]),
    );
    void this._space.postMessage(this._channel, encoding.toUint8Array(encoderAwarenessState));
  }

  get awareness(): Awareness {
    return this._awareness;
  }

  private _handleAwarenessUpdate({ added, updated, removed }: any, origin: any) {
    log('awareness update', { added, updated, removed, origin });
    const changedClients = added.concat(updated).concat(removed);
    const encoderAwareness = encoding.createEncoder();
    encoding.writeVarUint(encoderAwareness, messageAwareness);
    encoding.writeVarUint8Array(
      encoderAwareness,
      awarenessProtocol.encodeAwarenessUpdate(this._awareness, changedClients),
    );
    void this._space.postMessage(this._channel, encoding.toUint8Array(encoderAwareness));
  }

  private _handleSpaceMessage({ payload }: GossipMessage) {
    log('space message', payload);
    const data = new Uint8Array(Array.from(Object.values(payload)));
    const encoder = this._readMessage(data);
    if (encoder) {
      void this._space.postMessage(this._channel, encoding.toUint8Array(encoder));
    }
  }

  private _readMessage(message: Uint8Array) {
    const decoder = decoding.createDecoder(message);
    const encoder = encoding.createEncoder();
    const messageType = decoding.readVarUint(decoder);

    let sendReply = false;
    switch (messageType) {
      case messageAwareness: {
        awarenessProtocol.applyAwarenessUpdate(this._awareness, decoding.readVarUint8Array(decoder), this);
        break;
      }

      case messageQueryAwareness: {
        encoding.writeVarUint(encoder, messageAwareness);
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(this._awareness, Array.from(this._awareness.getStates().keys())),
        );
        sendReply = true;
        break;
      }

      default: {
        console.error('Invalid message:', messageType);
        return encoder;
      }
    }

    if (!sendReply) {
      // Nothing has been written, no answer created.
      return null;
    }

    return encoder;
  }

  private _handleBeforeUnload() {
    awarenessProtocol.removeAwarenessStates(this._awareness, [this._clientId], 'window unload');
  }
}
