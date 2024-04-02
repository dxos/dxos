//
// Copyright 2023 DXOS.org
//

import { DocumentType, TextV0Type, TableType } from '@braneframe/types';
import { next as A } from '@dxos/automerge/automerge';
import { createSpaceObjectGenerator, type SpaceObjectGenerator, TestSchemaType } from '@dxos/echo-generator';
import { Filter, getRawDoc } from '@dxos/echo-schema';
import * as E from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { faker } from '@dxos/random';
import { type Space } from '@dxos/react-client/echo';
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
      return this._space.db.add(E.object(TableType, { title, schema, props: props ?? [] }));
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

    return this._space.db.add(E.object(DocumentType, { title, content: E.object(TextV0Type, { content }) }));
  }

  updateDocument() {
    const { objects } = this._space.db.query(Filter.schema(DocumentType));
    if (objects.length) {
      const object = faker.helpers.arrayElement(objects);
      const text = object.content?.content ?? '';
      const idx = text.lastIndexOf(' ', faker.number.int({ min: 0, max: text.length }));
      const docAccessor = getRawDoc(object, ['content']);
      docAccessor.handle.change((doc) => {
        const insertText = idx >= 0 ? ' ' + faker.lorem.word() : faker.lorem.sentence();
        A.splice(doc, docAccessor.path.slice(), Math.max(idx, 0), 0, insertText.toString());
      });
    }
  }
}
