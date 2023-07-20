//
// Copyright 2023 DXOS.org
//

import type { Faker } from '@faker-js/faker';

import { Document } from '@braneframe/types';
import { SpaceProxy, Text } from '@dxos/client';
import { range } from '@dxos/util';

export class Generator {
  private _faker?: Faker;

  constructor(private readonly _space: SpaceProxy) {}

  async initialize() {
    // TODO(burdon): Async import Generator instead?
    const { faker } = await import('@faker-js/faker');
    this._faker = faker;
    return this;
  }

  createObject(type = Document.type.name) {
    switch (type) {
      case Document.type.name: {
        // TODO(burdon): Factor out generators.
        const title = this._faker!.lorem.sentence();
        const content = range(this._faker!.datatype.number({ min: 2, max: 8 }))
          .map(() => this._faker!.lorem.sentences(this._faker!.datatype.number({ min: 2, max: 16 })))
          .join('\n\n');

        this._space.db.add(new Document({ title, content: new Text(content) }));
        break;
      }
    }
  }

  updateObject(type = Document.type.name) {
    switch (type) {
      case Document.type.name: {
        const { objects } = this._space.db.query(Document.filter());
        if (objects.length) {
          // TODO(burdon): Standardize faker deps.
          const object = this._faker!.helpers.arrayElement(objects);
          const text = object.content.text;
          // TODO(burdon): Insert, update, or delete.
          const idx = text.lastIndexOf(' ', this._faker!.datatype.number({ min: 0, max: text.length }));
          if (idx !== -1) {
            object.content.model?.insert(' ' + this._faker!.lorem.word(), idx);
          }
        }

        break;
      }
    }
  }
}
