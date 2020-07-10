//
// Copyright 2020 DXOS.org
//

import { Model } from '@dxos/model-factory';
import { Doc, applyUpdate } from 'yjs';

export class XmlTextModel extends Model {
  _doc = new Doc()

  constructor (options) {
    super(options);

    this._doc.on('update', this._handleDocUpdated.bind(this));
  }

  get content () {
    return this._doc.getXmlFragment('content');
  }

  _handleDocUpdated (update, origin) {
    if (origin === this._doc.clientID) {
      // Local
      this.appendMessage({ update, origin });
    }
  }

  _transact (fn) {
    return this._doc.transact(fn, this._doc.clientID);
  }

  _insertInner = (node, index, text) => {
    if (node.constructor.name === 'YXmlText') {
      if (index <= node.length) {
        node.insert(index, text);
        return true;
      }

      return node.length;
    }

    let innerIndex = index;
    let childLength = 0;
    for (const childNode of node.toArray()) {
      const inserted = this._insertInner(childNode, innerIndex, text);

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

  insert (index, text) {
    return this._transact(() => this._insertInner(this.content, index, text));
  }

  // delete (index, count) {
  //   // return this._transact(() => this.content.delete(index, count));
  // }

  async onUpdate (messages) {
    messages.forEach(message => {
      applyUpdate(this._doc, message.update, message.origin);
    });
  }

  async onDestroy () {
    this._doc.off('update', this._handleDocUpdated.bind(this));
  }
}
