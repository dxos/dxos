//
// Copyright 2021 DXOS.org
//

// TODO(burdon): Factor out hook and create unit test for main replicator.
// NOTE: This file is originally from @dxos/editor: src/hooks/useYJSModel.ts.

import debug from 'debug';
import { applyUpdate, Doc } from 'yjs';

const log = debug('dxos:lexical-editor:replicator');

export type OnUpdate = (update: Uint8Array) => void

export interface SyncModelPeer {
  id: string
  name?: string
}

/**
 * Defines contract between the editor and the (YJS) data model.
 */
export interface SyncModel {
  id: string
  peer: SyncModelPeer
  doc: Doc
  onCreate: (processRemoteUpdate: OnUpdate, setUserName: (name: string) => void) => void
  onUpdate?: OnUpdate
  onStatusUpdate: OnUpdate
}

/**
 * Basic peer that joins the swarm.
 */
export class Peer {
  processRemoteUpdate: OnUpdate | undefined;

  constructor (
    readonly id: string,
    readonly model: SyncModel
  ) {}

  setRemoteUpdater (processRemoteUpdate: OnUpdate) {
    this.processRemoteUpdate = processRemoteUpdate;
  }
}

/**
 * This mocks the replication across the swarm.
 */
export class Replicator {
  private _peers: Peer[] = [];

  setPeers (peers: Peer[]) {
    this._peers = peers;
  }

  onUpdate (id: string, update: Uint8Array) {
    log('onUpdate:', id, update);
    this._peers
      .filter((peer: Peer) => peer.id !== id) // Don't replicate to self.
      .forEach((peer: Peer) => {
        applyUpdate(peer.model.doc, update, { author: id });
      });
  }

  onStatusUpdate (id: string, update: Uint8Array) {
    log('onStatusUpdate:', id, update);
    this._peers
      .filter((peer: Peer) => peer.id !== id)
      .forEach(({ processRemoteUpdate }: Peer) => {
        processRemoteUpdate && processRemoteUpdate(update);
      });
  }

  createPeer = (id: string, doc: Doc = new Doc()): Peer => {
    // TODO(burdon): Create concrete class that implements SyncModel?
    const model: SyncModel = {
      id: doc.guid,
      peer: { id },
      doc: doc || new Doc(),
      onCreate: (
        processRemoteUpdate: OnUpdate,
        setUsername: (name: string) => void
      ) => {
        this._peers.find(peer => peer.id === id)?.setRemoteUpdater(processRemoteUpdate);
        setUsername(id);
      },
      onUpdate: (update: Uint8Array) => {
        this.onUpdate(id, update);
      },
      onStatusUpdate: (update: Uint8Array) => {
        this.onStatusUpdate(id, update);
      }
    };

    const peer = new Peer(id, model);
    this._peers.push(peer);
    return peer;
  };
}
