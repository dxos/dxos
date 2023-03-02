//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { base, db, Text } from '@dxos/echo-schema';
import { createDatabase } from '@dxos/echo-schema/testing';
import { describe, test } from '@dxos/test';
import { range } from '@dxos/util';

import { Container, Document, Task } from './proto';

describe('database', () => {
  test('saving', async () => {
    const task = new Task({ title: 'test' });
    expect(task.title).to.eq('test');
    expect(task.id).to.exist;
    expect(task[base]).to.exist;
    expect(task[db]).to.be.undefined;

    const database = await createDatabase();
    await database.add(task);
    expect(task[db]).to.exist;

    const { objects: tasks } = database.query(Task.filter());
    expect(tasks).to.have.length(1);
    expect(tasks[0].id).to.eq(task.id);
  });

  describe('text', () => {
    test('text objects are auto-created on schema', async () => {
      const task = new Task();
      expect(task.description).to.be.instanceOf(Text);

      const database = await createDatabase();
      await database.add(task);
      expect(task.description).to.be.instanceOf(Text);

      task.description.model!.insert('test', 0);
      expect(task.description.model!.textContent).to.eq('test');
    });

    test('nested text', async () => {
      debugger;
      const database = await createDatabase();
      await Promise.all(
        range(10).map(async () => {
          const doc = new Document({ title: 'test' });
          doc.text = new Text('Some text');
          await database.add(doc);
          return doc;
        })
      );

      const documents = database.query(Document.filter()).objects;

      const container = new Container();
      await database.add(container);

      documents.forEach((document) => container.sections.push({ document }));
    });
  });
});
