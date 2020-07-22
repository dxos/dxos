//
// Copyright 2020 DXOS.org
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
export class ObjectModel extends Model {
  _store = new ObjectStore();

  // TODO(burdon): Rename getObject.
  getItem (id: string) {
    return this._store.getObjectById(id);
  }

  getObjectsByType (type: string) {
    return this._store.getObjectsByType(type);
  }

  // TODO(burdon): Rename createObject.
  createItem (type: string, properties: object, viewId?: string) {
    log('create', type, properties);

    const id = createObjectId(type);
    const mutations = fromObject({ id, properties });

    this.appendMessage({
      __type_url: type,
      viewId,
      ...mutations
    });

    return id;
  }

  // TODO(burdon): Rename updateObject.
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

  // TODO(burdon): Rename deleteObject.
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
    this._store.applyMutations(messages);
  }
}
