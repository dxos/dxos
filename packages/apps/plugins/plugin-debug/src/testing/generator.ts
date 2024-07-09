//
// Copyright 2023 DXOS.org
//

import { DocumentType, TextType, TableType } from '@braneframe/types';
import { next as A } from '@dxos/automerge/automerge';
import { createSpaceObjectGenerator, type SpaceObjectGenerator, TestSchemaType } from '@dxos/echo-generator';
import { create } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { faker } from '@dxos/random';
import { type Space, Filter, createDocAccessor } from '@dxos/react-client/echo';
import { range } from '@dxos/util';

const tableDefs: { type: TestSchemaType; name: string; props?: TableType['props'] }[] = [
  {
    type: TestSchemaType.organization,
    name: 'Organizations',
  },
  {
    type: TestSchemaType.project,
    name: 'Projects',
  },
  {
    type: TestSchemaType.contact,
    name: 'Contacts',
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
    return tableDefs.map(({ type, name, props }) => {
      const schema = this._generator.getSchema(type);
      return this._space.db.add(create(TableType, { name, schema, props: props ?? [] }));
    });
  }

  createObjects(count: Partial<Record<TestSchemaType, number>> = defaultCount) {
    void this._generator.createObjects(count).catch();
  }

  createDocument() {
    const name = faker.lorem.sentence();
    const content = range(faker.number.int({ min: 2, max: 8 }))
      .map(() => faker.lorem.sentences(faker.number.int({ min: 2, max: 16 })))
      .join('\n\n');

    return this._space.db.add(create(DocumentType, { name, content: create(TextType, { content }), threads: [] }));
  }

  async updateDocument() {
    const { objects } = await this._space.db.query(Filter.schema(DocumentType)).run();
    if (objects.length) {
      const object = faker.helpers.arrayElement(objects);
      const text = object.content?.content ?? '';
      const idx = text.lastIndexOf(' ', faker.number.int({ min: 0, max: text.length }));
      const docAccessor = createDocAccessor(object, ['content']);
      docAccessor.handle.change((doc) => {
        const insertText = idx >= 0 ? ' ' + faker.lorem.word() : faker.lorem.sentence();
        A.splice(doc, docAccessor.path.slice(), Math.max(idx, 0), 0, insertText.toString());
      });
    }
  }
}
