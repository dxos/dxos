//
// Copyright 2023 DXOS.org
//

import type { Faker } from '@faker-js/faker';

import { Document as DocumentType, Table as TableType } from '@braneframe/types';
import { type Space, Text } from '@dxos/client/echo';
import { createSpaceObjectGenerator, type TestSchemaType } from '@dxos/echo-generator';
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

  createTables(options: Partial<Record<TestSchemaType, number>> = { organization: 30, project: 20, person: 200 }) {
    const generator = createSpaceObjectGenerator(this._space);

    const tables: { type: TestSchemaType; title: string; props?: TableType['props'] }[] = [
      {
        type: 'organization',
        title: 'Organizations',
      },
      {
        type: 'project',
        title: 'Projects',
      },
      {
        type: 'person',
        title: 'People',
        props: [
          {
            id: 'org',
            refProp: 'name',
          },
        ],
      },
    ];

    // Generate tables.
    tables.forEach(({ type, title, props }) => {
      // TODO(burdon): Detect if schema already exists.
      const schema = generator.schema[type];
      this._space.db.add(schema);
      this._space.db.add(new TableType({ title, schema, props }));
    });

    // Generate objects.
    tables.forEach(({ type }) => {
      generator.createObjects({ types: [type], count: options[type] ?? 0 });
    });

    log('created objects', options);
  }

  createDocument() {
    // TODO(burdon): Factor out generators.
    const title = this._faker!.lorem.sentence();
    const content = range(this._faker!.number.int({ min: 2, max: 8 }))
      .map(() => this._faker!.lorem.sentences(this._faker!.number.int({ min: 2, max: 16 })))
      .join('\n\n');

    this._space.db.add(new DocumentType({ title, content: new Text(content) }));
  }

  async updateDocument() {
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

    this._space.internal.db.commitBatch();
    await this._space.db.flush();
  }
}
