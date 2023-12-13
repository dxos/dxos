//
// Copyright 2023 DXOS.org
//

import { Event } from '@dxos/async';
import {
  type Doc,
  next as automerge,
  type ChangeOptions,
  type ChangeFn,
  type Heads,
  type SyncState,
} from '@dxos/automerge/automerge';
import { IDocHandle } from './automerge-plugin/handle';

export class Peer implements IDocHandle {
  docSync(): Doc<any> | undefined {
    return this.doc;
  }
  addListener(event: 'change', listener: () => void): void {
    this.changeEvent.on(listener);
  }
  removeListener(event: 'change', listener: () => void): void {
    this.changeEvent.off(listener);
  }
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

  change(callback: ChangeFn<any>, options?: string | ChangeOptions<any> | ChangeFn<any>) {
    if (options) {
      this.doc = automerge.change(this.doc!, options, callback);
    } else {
      this.doc = automerge.change(this.doc!, callback);
    }
    this._handleChange();
  }

  changeAt(heads: Heads, callback: ChangeFn<any>, options?: ChangeOptions<any>) {
    let result: Heads | undefined;
    if (options) {
      const { newDoc, newHeads } = automerge.changeAt(this.doc!, heads, options, callback);
      this.doc = newDoc;
      result = newHeads ?? undefined;
    } else {
      const { newDoc, newHeads } = automerge.changeAt(this.doc!, heads, callback);
      this.doc = newDoc;
      result = newHeads ?? undefined;
    }
    this._handleChange();
    return result;
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
