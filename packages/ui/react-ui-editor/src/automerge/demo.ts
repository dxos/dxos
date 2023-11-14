import { type Doc, next as automerge, ChangeOptions, ChangeFn, Heads, SyncState } from "@automerge/automerge";
import { Event } from "@dxos/async";

export class EchoObject {
  changeEvent = new Event();

  doc!: Doc<{ text: string }>

  change(options: string | ChangeOptions<any> | ChangeFn<any>, callback?: ChangeFn<any>) {
    this.doc = automerge.change(this.doc, options, callback);
    this.changeEvent.emit();
  }

  changeAt(scope: Heads, options: string | ChangeOptions<any> | ChangeFn<any>, callback?: ChangeFn<any>) {
    const { newDoc, newHeads } = automerge.changeAt(this.doc, scope, options, callback);
    this.doc = newDoc;
    this.changeEvent.emit();
    return newHeads;
  }

  replicate(): { readable: ReadableStream<Uint8Array>, writable: WritableStream<Uint8Array> } {
    let syncState: SyncState = automerge.initSyncState();

    let unsub: (() => void) | undefined;
    const readable = new ReadableStream({
      start: (controller) => {
        unsub = this.changeEvent.on(() => {
          const [newState, msg] = automerge.generateSyncMessage(this.doc, syncState);
          syncState = newState;

          if (msg) {
            controller.enqueue(msg);
          }
        })
      },
      pull: (controller) => {
        const [newState, msg] = automerge.generateSyncMessage(this.doc, syncState);
        syncState = newState;

        if (msg) {
          controller.enqueue(msg);
        }
      },
      cancel: () => {
        unsub?.();
      }
    })

    const writable = new WritableStream({
      write: (chunk) => {
        const [newDoc, newState] = automerge.receiveSyncMessage(this.doc, syncState, chunk);
        this.doc = newDoc;
        syncState = newState;
        this.changeEvent.emit();
      }
    })

    return { readable, writable }
  }
}
