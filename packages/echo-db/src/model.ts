//
// Copyright 2020 DxOS.org
//

import debug from 'debug';

// TODO(burdon): Remove dependency (via adapter). Or move to other package.
import { Model } from '@dxos/model-factory';

import { MutationUtil } from './mutation';
import { ObjectStore, fromObject } from './object-store';
import { createObjectId, parseObjectId } from './util';
import { dxos } from './proto/gen/echo';

const log = debug('dxos:echo:model');

/**
 * Stream adapter.
 */
// TODO(burdon): Rename ObjectModel.
export class EchoModel extends Model {
  _model = new ObjectStore();

  getObjectsByType (type: string) {
    return this._model.getObjectsByType(type);
  }

  createItem (type: string, properties: object) {
    log('create', type, properties);

    const id = createObjectId(type);
    const mutations = fromObject({ id, properties });

    this.appendMessage({
      __type_url: type,
      ...mutations
    });

    return id;
  }

  updateItem (id: string, properties: object) {
    log('update', id, properties);

    const { type } = parseObjectId(id);
    const mutations = fromObject({
      id,
      properties
    });

    this.appendMessage({
      __type_url: type,
      ...mutations
    });
  }

  deleteItem (id: string) {
    log('delete', id);

    const { type } = parseObjectId(id);
    const mutation = MutationUtil.createMessage(id, { deleted: true });

    this.appendMessage({
      __type_url: type,
      ...mutation
    });
  }

  onUpdate (messages: dxos.echo.IObjectMutation[]) {
    this._model.applyMutations(messages);
  }
}
