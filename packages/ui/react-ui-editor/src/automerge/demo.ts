import { type Doc, next as automerge, ChangeOptions, ChangeFn, Heads } from "@automerge/automerge";
import { Event } from "@dxos/async";

export class EchoObject {
  changeEvent = new Event();

  doc!: Doc<{ text: string}>

  change(options: string | ChangeOptions<any> | ChangeFn<any>, callback?: ChangeFn<any>) {
    this.doc = automerge.change(this.doc, options, callback);
    this.processChange();
  }

  changeAt(scope: Heads, options: string | ChangeOptions<any> | ChangeFn<any>, callback?: ChangeFn<any>) {
    const { newDoc, newHeads } = automerge.changeAt(this.doc, scope, options,callback);
    this.doc = newDoc;
    this.processChange();
    return newHeads;
  }

  processChange() {
    this.changeEvent.emit();
    const change = automerge.getLastLocalChange(this.doc);
    console.log('change', change);
  }
}
