//
// Copyright 2020 DxOS
//

import debug from 'debug';

import { Model } from '@dxos/data-client';

import { MutationUtil } from './mutation';
import { ObjectModel } from './object';
import { createId, fromObject, parseId } from './util';

const log = debug('dxos:echo:model');

/**
 * Stream adapter.
 */
export class EchoModel extends Model {

  _model = new ObjectModel();

  getObjectsByType(type) {
    return this._model.getObjectsByType(type);
  }

  createItem(type, properties) {
    log('create', type, properties);

    const id = createId(type);
    const mutations = fromObject({ id, properties });

    // TODO(burdon): Create single message.
    mutations.forEach((mutation) => {
      this.appendMessage({
        __type_url: type,
        ...mutation
      });
    });

    return id;
  }

  updateItem(id, properties) {
    log('update', id, properties);

    const { type } = parseId(id);
    const mutations = fromObject({
      id,
      properties
    });

    // TODO(burdon): Create single message.
    mutations.forEach((mutation) => {
      this.appendMessage({
        __type_url: type,
        ...mutation
      });
    });
  }

  deleteItem(id) {
    log('delete', id);

    const { type } = parseId(id);
    const mutation = MutationUtil.createMessage(id, undefined, { deleted: true });

    this.appendMessage({
      __type_url: type,
      ...mutation
    });
  }

  onUpdate(messages) {
    this._model.applyMutations(messages);
  }
}
