//
// Copyright 2023 DXOS.org
//

// TODO(wittjosiah): Remove. Use DXOS protocols to reduce duplicate functionality weighing down apps.
import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';
import { Observable } from 'lib0/observable';
import { useMemo } from 'react';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as syncProtocol from 'y-protocols/sync';
import { Doc } from 'yjs';

import { Event } from '@dxos/async';
import { log } from '@dxos/log';
import { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';

import { cursorColor, type EditorModel } from '../hooks';

type Awareness = awarenessProtocol.Awareness;

const messageSync = 0;
const messageAwareness = 1;
const messageQueryAwareness = 3;

/**
 * Yjs awareness provider in-memory.
 */
export class AwarenessProvider extends Observable<any> {
  private readonly _remoteUpdate: Event<Uint8Array>;
  private readonly _awareness: Awareness;
  private readonly _doc: Doc;

  constructor({ update, doc, awareness }: { update: Event<Uint8Array>; doc: Doc; awareness?: Awareness }) {
    super();
    this._remoteUpdate = update;
    this._doc = doc;
    this._awareness = awareness ?? new awarenessProtocol.Awareness(doc);

    this._doc.on('update', this._handleDocUpdate.bind(this));
    this._awareness.on('update', this._handleAwarenessUpdate.bind(this));
    this._remoteUpdate.on(this._handleRemoteUpdate.bind(this));

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this._handleBeforeUnload.bind(this));
    } else if (typeof process !== 'undefined') {
      process.on('exit', this._handleBeforeUnload.bind(this));
    }

    // Post queryAwareness.
    const encoderAwarenessQuery = encoding.createEncoder();
    encoding.writeVarUint(encoderAwarenessQuery, messageQueryAwareness);
    void this._remoteUpdate.emit(encoding.toUint8Array(encoderAwarenessQuery));

    // Post local awareness state.
    const encoderAwarenessState = encoding.createEncoder();
    encoding.writeVarUint(encoderAwarenessState, messageAwareness);
    encoding.writeVarUint8Array(
      encoderAwarenessState,
      awarenessProtocol.encodeAwarenessUpdate(this.awareness, [this._doc.clientID]),
    );
    void this._remoteUpdate.emit(encoding.toUint8Array(encoderAwarenessState));
  }

  get awareness(): Awareness {
    return this._awareness;
  }

  private _handleDocUpdate(update: Uint8Array, origin: any) {
    log('doc update', { update, origin });
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeUpdate(encoder, update);
    this._remoteUpdate.emit(encoding.toUint8Array(encoder));
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
    this._remoteUpdate.emit(encoding.toUint8Array(encoderAwareness));
  }

  private _handleRemoteUpdate(payload: Uint8Array) {
    log('remote update', { payload });
    const data = new Uint8Array(Array.from(Object.values(payload)));
    const encoder = this._readMessage(data);
    if (encoder) {
      this._remoteUpdate.emit(encoding.toUint8Array(encoder));
    }
  }

  private _readMessage(message: Uint8Array) {
    const decoder = decoding.createDecoder(message);
    const encoder = encoding.createEncoder();
    const messageType = decoding.readVarUint(decoder);

    let sendReply = false;
    switch (messageType) {
      case messageSync: {
        encoding.writeVarUint(encoder, messageSync);
        syncProtocol.readSyncMessage(decoder, encoder, this._doc, this);
        break;
      }

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
    awarenessProtocol.removeAwarenessStates(this._awareness, [this._doc.clientID], 'window unload');
  }
}

/**
 * This mocks the replication across the swarm.
 */
export class Replicator {
  private readonly _update = new Event<Uint8Array>();
  private _peers: EditorModel[] = [];

  constructor(private readonly _kind: TextKind) {}

  setPeers(peers: EditorModel[]) {
    this._peers = peers;
  }

  createPeer = (id: string, doc: Doc = new Doc()): EditorModel => {
    const provider = new AwarenessProvider({ update: this._update, doc });
    provider.awareness.setLocalStateField('user', {
      name: 'Anonymous ' + Math.floor(Math.random() * 100),
      color: cursorColor.color,
      colorLight: cursorColor.light,
    });

    const model: EditorModel = {
      id: doc.guid,
      content: this._kind === TextKind.PLAIN ? doc.getText('content') : doc.getXmlFragment('content'),
      text: () => model.content.toString(),
      awareness: provider.awareness,
      peer: { id },
    };

    this._peers.push(model);

    return model;
  };
}

export type UseYjsModelOptions = {
  replicator: Replicator;
  id: string;
  doc?: Doc;
};

export const useYjsModel = ({ replicator, id, doc }: UseYjsModelOptions): EditorModel => {
  const peer = useMemo(() => replicator.createPeer(id, doc), [doc]);
  return peer;
};
