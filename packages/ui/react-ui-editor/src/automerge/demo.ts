//
// Copyright 2023 DXOS.org
//

import {
  type Doc,
  next as automerge,
  type ChangeOptions,
  type ChangeFn,
  type Heads,
  type SyncState,
} from '@automerge/automerge';

import { Event } from '@dxos/async';

export class Peer {
  changeEvent = new Event();

  storage = new Map<string, Uint8Array>();
  stats = {
    messagesSent: 0,
    messagesReceived: 0,
    bytesSent: 0,
    bytesReceived: 0,
    snapshotBytes: 0,
    incrementalBytes: 0,
  };

  doc!: Doc<{ text: string }>;

  change(options: string | ChangeOptions<any> | ChangeFn<any>, callback?: ChangeFn<any>) {
    this.doc = automerge.change(this.doc, options, callback);
    this._handleChange();
  }

  changeAt(scope: Heads, options: string | ChangeOptions<any> | ChangeFn<any>, callback?: ChangeFn<any>) {
    const { newDoc, newHeads } = automerge.changeAt(this.doc, scope, options, callback);
    this.doc = newDoc;
    this._handleChange();
    return newHeads;
  }

  replicate(): { readable: ReadableStream<Uint8Array>; writable: WritableStream<Uint8Array> } {
    let syncState: SyncState = automerge.initSyncState();

    let unsub: (() => void) | undefined;
    const readable = new ReadableStream({
      start: (controller) => {
        unsub = this.changeEvent.on(() => {
          const [newState, msg] = automerge.generateSyncMessage(this.doc, syncState);
          syncState = newState;

          if (msg) {
            this.stats.messagesSent++;
            this.stats.bytesSent += msg.byteLength;
            controller.enqueue(msg);
          }
        });
      },
      pull: (controller) => {
        const [newState, msg] = automerge.generateSyncMessage(this.doc, syncState);
        syncState = newState;

        if (msg) {
          this.stats.messagesSent++;
          this.stats.bytesSent += msg.byteLength;
          controller.enqueue(msg);
        }
      },
      cancel: () => {
        unsub?.();
      },
    });

    const writable = new WritableStream({
      write: (chunk) => {
        this.stats.messagesReceived++;
        this.stats.bytesReceived += chunk.byteLength;

        const [newDoc, newState] = automerge.receiveSyncMessage(this.doc, syncState, chunk);
        this.doc = newDoc;
        syncState = newState;

        this._handleChange();
      },
    });

    return { readable, writable };
  }

  private _handleChange() {
    // TODO(dmaretskyi): Save since + debounce.

    if (this.stats.incrementalBytes > 1024 && this.stats.incrementalBytes > this.stats.snapshotBytes) {
      const snapshot = automerge.save(this.doc);
      this.stats.snapshotBytes = snapshot.byteLength;
      this.stats.incrementalBytes = 0;
      console.log('snapshot save', snapshot.byteLength);
    } else {
      const chunk = automerge.saveIncremental(this.doc);
      this.stats.incrementalBytes += chunk.length;
      console.log('incremental save', chunk.length);
    }

    this.changeEvent.emit();
  }
}
