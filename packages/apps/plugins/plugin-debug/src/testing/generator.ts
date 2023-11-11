//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';

import { Document as DocumentType, Table as TableType } from '@braneframe/types';
import { type Space, TextObject } from '@dxos/client/echo';
import { createSpaceObjectGenerator, type SpaceObjectGenerator, TestSchemaType } from '@dxos/echo-generator';
import { invariant } from '@dxos/invariant';
import { range } from '@dxos/util';

const tableDefs: { type: TestSchemaType; title: string; props?: TableType['props'] }[] = [
  {
    type: TestSchemaType.organization,
    title: 'Organizations',
  },
  {
    type: TestSchemaType.project,
    title: 'Projects',
  },
  {
    type: TestSchemaType.contact,
    title: 'Contacts',
    props: [
      {
        id: 'org',
        refProp: 'name',
      },
    ],
  },
];

const defaultCount: Partial<Record<TestSchemaType, number>> = {
  [TestSchemaType.organization]: 50,
  [TestSchemaType.project]: 60,
  [TestSchemaType.contact]: 200,
};

export class Generator {
  private readonly _generator: SpaceObjectGenerator<TestSchemaType>;

  constructor(private readonly _space: Space) {
    invariant(this._space);
    this._generator = createSpaceObjectGenerator(this._space);
  }

  createTables() {
    return tableDefs.map(({ type, title, props }) => {
      // TODO(burdon): Check if already exists.
      const schema = this._space.db.add(this._generator.schema[type]);
      return this._space.db.add(new TableType({ title, schema, props }));
    });
  }

  createObjects(count: Partial<Record<TestSchemaType, number>> = defaultCount) {
    this._generator.createObjects(count);
  }

  createDocument() {
    const title = faker.lorem.sentence();
    const content = range(faker.number.int({ min: 2, max: 8 }))
      .map(() => faker.lorem.sentences(faker.number.int({ min: 2, max: 16 })))
      .join('\n\n');

    return this._space.db.add(new DocumentType({ title, content: new TextObject(content) }));
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
