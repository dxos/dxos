//
// Copyright 2023 DXOS.org
//

import type { Faker } from '@faker-js/faker';

import { Document as DocumentType } from '@braneframe/types';
import { Space, Text } from '@dxos/client/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { range } from '@dxos/util';

export class Generator {
  private _faker?: Faker;

  constructor(private readonly _space: Space) {
    invariant(this._space);
  }

  async initialize() {
    // TODO(burdon): Async import Generator instead?
    const { faker } = await import('@faker-js/faker');
    this._faker = faker;
    return this;
  }

  createObject({ type = DocumentType.type.name, createContent = false } = {}) {
    log('update', { type });
    switch (type) {
      case DocumentType.type.name: {
        // TODO(burdon): Factor out generators.
        const title = this._faker!.lorem.sentence();
        const content = createContent
          ? range(this._faker!.number.int({ min: 2, max: 8 }))
              .map(() => this._faker!.lorem.sentences(this._faker!.number.int({ min: 2, max: 16 })))
              .join('\n\n')
          : '';

        this._space.db.add(new DocumentType({ title, content: new Text(content) }));
        break;
      }
    }
  }

  async updateObject(type = DocumentType.type.name) {
    switch (type) {
      case DocumentType.type.name: {
        const { objects } = this._space.db.query(DocumentType.filter());
        if (objects.length) {
          // TODO(burdon): Standardize faker deps.
          const object = this._faker!.helpers.arrayElement(objects);
          const text = object.content.text;
          // TODO(burdon): Insert, update, or delete.
          const idx = text.lastIndexOf(' ', this._faker!.number.int({ min: 0, max: text.length }));
          if (idx !== -1) {
            object.content.model?.insert(' ' + this._faker!.lorem.word(), idx);
          } else {
            object.content.model?.insert(this._faker!.lorem.sentence(), 0);
          }
        }

        break;
      }
    }

    // TODO(burdon): Make optional.
    await this._space.db.flush();
  }
}
