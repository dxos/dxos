//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';
import { Doc, XmlElement, XmlText, XmlFragment, applyUpdate, encodeStateAsUpdate } from 'yjs';

import { Model, ModelMeta, MutationProcessMeta, MutationWriter, StateMachine } from '@dxos/model-factory';
import { ItemID, schema } from '@dxos/protocols';
import { Mutation, Snapshot } from '@dxos/protocols/proto/dxos/echo/model/text';

class TextModelStateMachine implements StateMachine<Doc, Mutation, Snapshot> {
  private _doc = new Doc();

  getState (): Doc {
    return this._doc;
  }

  process (mutation: Mutation, meta: MutationProcessMeta): void {
    const { update, clientId } = mutation;
    assert(update);

    if (clientId !== this._doc.clientID) {
      applyUpdate(this._doc, update, { docClientId: clientId });
    }
  }

  snapshot () {
    return {
      data: encodeStateAsUpdate(this._doc)
    };
  }

  reset (snapshot: Snapshot): void {
    assert(snapshot.data);

    applyUpdate(this._doc, snapshot.data);
  }
}

export class TextModel extends Model<Doc, Mutation> {
  static meta: ModelMeta = {
    type: 'dxos:model/text',
    stateMachine: () => new TextModelStateMachine(),
    mutationCodec: schema.getCodecForType('dxos.echo.model.text.Mutation'),
    snapshotCodec: schema.getCodecForType('dxos.echo.model.text.Snapshot')
  };

  constructor (meta: ModelMeta, itemId: ItemID, getState: () => Doc, writeStream?: MutationWriter<Mutation>) {
    super(meta, itemId, getState, writeStream);

    this._getState().on('update', this._handleDocUpdated.bind(this));
  }

  get doc (): Doc {
    return this._getState();
  }

  get content () {
    return this._getState().getXmlFragment('content');
  }

  // TODO(burdon): How is this different?
  get textContent () {
    return this._textContentInner(this.content);
  }

  private async _handleDocUpdated (update: Uint8Array, origin: any) {
    const remote = origin && origin.docClientId && origin.docClientId !== this._getState().clientID;
    if (!remote) {
      await this.write({
        clientId: this._getState().clientID,
        update
      });
    }
  }

  private _transact (fn: () => void) {
    return this._getState().transact(fn, { docClientId: this._getState().clientID });
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
  };

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
      // Empty doc, create an empty paragraph.
      const paragraph = new XmlElement('paragraph');
      paragraph.insert(0, [new XmlText('')]);
      node.insert(0, [paragraph]);
    }

    // TODO(dmaretskyi): What is the type of `node` here?
    for (const childNode of (node as any).toArray()) {
      const inserted = this._insertInner(childNode as any, innerIndex, text);
      if (inserted === true) {
        return true;
      }

      childLength += inserted;

      // Previous node length = inserted.
      // Jump block = 1.
      innerIndex -= inserted + 1;
    }

    return childLength;
  };

  insert (text: string, index: number) {
    return this._transact(() => this._insertInner(this.content, index, text));
  }

  insertTextNode (text: string, index = 0) {
    const paragraph = new XmlElement('paragraph');
    const yXmlText = new XmlText(text);
    paragraph.insert(0, [yXmlText]);
    return this._transact(() => this.content.insert(index, [paragraph]));
  }
}
