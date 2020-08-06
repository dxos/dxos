//
// Copyright 2020 DXOS.org
//

import { applyUpdate, Doc, XmlElement, XmlText } from 'yjs';

import { Model } from '@dxos/model-factory';

const nodeIs = typeName => node => node.constructor.name === typeName;
const nodeIsText = nodeIs('YXmlText');
const nodeIsXmlFragment = nodeIs('YXmlFragment');

export const TYPE_TEXT_MODEL_UPDATE = 'wrn_dxos_org_echo_text_model_update';

export class TextModel extends Model {
  _doc = new Doc();

  constructor (options) {
    super(options);

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

  _handleDocUpdated (update, origin) {
    const remote = origin && origin.docClientId && origin.docClientId !== this._doc.clientID;

    if (!remote) {
      this.appendMessage({
        __type_url: TYPE_TEXT_MODEL_UPDATE,
        update,
        origin: { docClientId: this._doc.clientID }
      });
    }
  }

  _transact (fn) {
    return this._doc.transact(fn, { docClientId: this._doc.clientID });
  }

  _textContentInner = node => {
    if (nodeIsText(node)) {
      return node.toString();
    }

    if (node.length === 0) {
      return nodeIsXmlFragment(node) ? '' : '\n';
    }

    const textContentNodes = [];
    const nodes = node.toArray();

    for (const childNode of nodes) {
      textContentNodes.push(this._textContentInner(childNode));
    }

    return textContentNodes.join('\n');
  }

  _insertInner = (node, index, text) => {
    if (nodeIsText(node)) {
      if (index <= node.length) {
        node.insert(index, text);
        return true;
      }

      return node.length;
    }

    let innerIndex = index;
    let childLength = 0;

    if (nodeIsXmlFragment(node) && node.length === 0) {
      // Empty doc, create an empty paragraph
      const paragraph = new XmlElement('paragraph');
      paragraph.insert(0, [new XmlText('')]);
      node.insert(0, [paragraph]);
    }

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

  onUpdate (messages) {
    messages.forEach(message => {
      const { update, origin } = message;

      if (origin.docClientId !== this._doc.clientID) {
        const arrayUpdate = Uint8Array.from(Object.values(update));
        return applyUpdate(this._doc, arrayUpdate, origin);
      }
    });
  }

  onDestroy () {
    this._doc.off('update', this._handleDocUpdated.bind(this));
  }
}
