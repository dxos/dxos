//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { base, db, Text } from '@dxos/echo-schema';
import { createDatabase } from '@dxos/echo-schema/testing';
import { describe, test } from '@dxos/test';

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
      const database = await createDatabase();

      const container = new Container();
      await database.add(container);

      const title = 'Our doc';
      const text = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
      container.sections.push(
        new Container.Section({ document: new Document({ title: 'Our doc', text: new Text(text) }) })
      );

      const queriedDoc = database.query(Document.filter({ title })).objects[0];
      expect(queriedDoc.title).to.equal(title);
      expect(queriedDoc.text.text).to.equal(text);
    });
  });
});
