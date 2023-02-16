//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { sleep } from '@dxos/async';
import { describe, test } from '@dxos/test';

import { Document } from './document';
import { SerializedSpace, Serializer } from './serializer';
import { createDatabase } from './testing';

describe('Serializer', () => {
  test('Basic', async () => {
    const serializer = new Serializer();

    let data: SerializedSpace;

    {
      const db = await createDatabase();
      const obj = new Document();
      obj.title = 'Test';
      await db.add(obj);
      expect(db.objects).to.have.length(1);

      data = await serializer.export(db);
      expect(data.objects).to.have.length(1);
      expect(data.objects[0]).to.deep.eq({
        '@id': obj.id,
        '@type': undefined,
        title: 'Test'
      });
    }

    {
      const db = await createDatabase();
      await serializer.import(db, data);

      const { objects } = db.query();
      expect(objects).to.have.length(1);
      expect(objects[0].title).to.eq('Test');
    }
  });

  test('Array of nested objects', async () => {
    const serializer = new Serializer();

    let serialized: SerializedSpace;

    {
      const db = await createDatabase();
      const obj = new Document({
        title: 'Main task',
        subtasks: [
          new Document({
            title: 'Subtask 1'
          }),
          new Document({
            title: 'Subtask 2'
          })
        ]
      });
      await db.add(obj);

      await sleep(100);

      expect(db.objects).to.have.length(3);

      serialized = await serializer.export(db);
      expect(serialized.objects).to.have.length(3);
    }

    {
      const db = await createDatabase();
      await serializer.import(db, serialized);

      const { objects } = db.query();
      expect(objects).to.have.length(3);
      const main = objects.find((object) => object.title === 'Main task')!;
      expect(main).to.exist;
      expect(main.subtasks).to.have.length(2);
      expect(main.subtasks[0]).to.be.instanceOf(Document);
      expect(main.subtasks[0].title).to.eq('Subtask 1');
      expect(main.subtasks[1]).to.be.instanceOf(Document);
      expect(main.subtasks[1].title).to.eq('Subtask 2');
    }
  });

  // TODO(burdon): Create typed tests in echo-typegen.
});
