//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import { Doc, XmlElement, XmlText, XmlFragment, applyUpdate, encodeStateAsUpdate } from 'yjs';

import { FeedWriter, ItemID, MutationMeta } from '@dxos/echo-protocol';
import { Model, ModelMeta } from '@dxos/model-factory';

import { schema } from './proto/gen';
import { Mutation, Snapshot } from './proto/gen/dxos/echo/text';

export class TextModel extends Model<Mutation> {
  static meta: ModelMeta = {
    type: 'wrn://protocol.dxos.org/model/text',
    mutation: schema.getCodecForType('dxos.echo.text.Mutation'),
    snapshotCodec: schema.getCodecForType('dxos.echo.text.Snapshot')
  };

  private _doc = new Doc();

  constructor (meta: ModelMeta, itemId: ItemID, writeStream?: FeedWriter<Mutation>) {
    super(meta, itemId, writeStream);

    this._doc.on('update', this._handleDocUpdated.bind(this));
  }

  get doc () {
    return this._doc;
  }

  get content () {
    return this._doc.getXmlFragment('content');
  }

  get textContent () {
    return this._textContentInner(this.content);
  }

  private async _handleDocUpdated (update: Uint8Array, origin: any) {
    const remote = origin && origin.docClientId && origin.docClientId !== this._doc.clientID;

    if (!remote) {
      this.write({
        update,
        clientId: this._doc.clientID
      });
    }
  }

  private _transact (fn: () => void) {
    return this._doc.transact(fn, { docClientId: this._doc.clientID });
  }

  private _textContentInner = (node: any): string => {
    if (node instanceof XmlText) {
      return node.toString();
    }

    if (node.length === 0) {
      return node instanceof XmlFragment ? '' : '\n';
    }

    const textContentNodes = [];
    const nodes = node.toArray();

    for (const childNode of nodes) {
      textContentNodes.push(this._textContentInner(childNode));
    }

    return textContentNodes.join('\n');
  }

  private _insertInner = (node: unknown, index: number, text: string) => {
    if (node instanceof XmlText) {
      if (index <= node.length) {
        node.insert(index, text);
        return true;
      }

      return node.length;
    }

    let innerIndex = index;
    let childLength = 0;

    if (node instanceof XmlFragment && node.length === 0) {
      // Empty doc, create an empty paragraph
      const paragraph = new XmlElement('paragraph');
      paragraph.insert(0, [new XmlText('')]);
      node.insert(0, [paragraph]);
    }

    // TODO(marik-d): What is the type of `node` here?
    for (const childNode of (node as any).toArray()) {
      const inserted = this._insertInner(childNode as any, innerIndex, text);

      if (inserted === true) {
        return true;
      }

      childLength += inserted;

      // Previous node length = inserted
      // Jump block = 1
      innerIndex -= inserted + 1;
    }

    return childLength;
  };

  insert (index: number, text: string) {
    return this._transact(() => this._insertInner(this.content, index, text));
  }

  async _processMessage (meta: MutationMeta, message: Mutation): Promise<boolean> {
    const { update, clientId } = message;
    assert(update);

    if (clientId !== this._doc.clientID) {
      applyUpdate(this._doc, update, { docClientId: clientId });
    }

    return true;
  }

  createSnapshot (): Snapshot {
    return {
      data: encodeStateAsUpdate(this._doc)
    };
  }

  async restoreFromSnapshot (snapshot: Snapshot) {
    assert(snapshot.data);

    applyUpdate(this._doc, snapshot.data);
  }
}
