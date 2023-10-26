//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';

import { Document as DocumentType, Table as TableType } from '@braneframe/types';
import { type Space, Text } from '@dxos/client/echo';
import { createSpaceObjectGenerator, type TestSchemaType } from '@dxos/echo-generator';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { range } from '@dxos/util';

export class Generator {
  constructor(private readonly _space: Space) {
    invariant(this._space);
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
    const title = faker.lorem.sentence();
    const content = range(faker.number.int({ min: 2, max: 8 }))
      .map(() => faker.lorem.sentences(faker.number.int({ min: 2, max: 16 })))
      .join('\n\n');

    this._space.db.add(new DocumentType({ title, content: new Text(content) }));
  }

  updateDocument() {
    const { objects } = this._space.db.query(DocumentType.filter());
    if (objects.length) {
      const object = faker.helpers.arrayElement(objects);
      const text = object.content.text;
      const idx = text.lastIndexOf(' ', faker.number.int({ min: 0, max: text.length }));
      if (idx !== -1) {
        object.content.model?.insert(' ' + faker.lorem.word(), idx);
      } else {
        object.content.model?.insert(faker.lorem.sentence(), 0);
      }
    }
  }
}
