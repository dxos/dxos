//
// Copyright 2023 DXOS.org
//

import { Document as DocumentType, Table as TableType } from '@braneframe/types/proto';
import { createSpaceObjectGenerator, type SpaceObjectGenerator, TestSchemaType } from '@dxos/echo-generator';
import { getTextContent } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { faker } from '@dxos/random';
import { type Space, TextObject } from '@dxos/react-client/echo';
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
  [TestSchemaType.organization]: 40,
  [TestSchemaType.project]: 80,
  [TestSchemaType.contact]: 160,
};

// TODO(wittjosiah): Use @dxos/echo-generator.
export class Generator {
  private readonly _generator: SpaceObjectGenerator<TestSchemaType>;

  constructor(private readonly _space: Space) {
    invariant(this._space);
    this._generator = createSpaceObjectGenerator(this._space);
  }

  createTables() {
    return tableDefs.map(({ type, title, props }) => {
      const schema = this._generator.getSchema(type);
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
      const text = getTextContent(object.content, '');
      const idx = text.lastIndexOf(' ', faker.number.int({ min: 0, max: text.length }));
      if (idx !== -1) {
        object.content.model?.insert(' ' + faker.lorem.word(), idx);
      } else {
        object.content.model?.insert(faker.lorem.sentence(), 0);
      }
    }
  }
}
