//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';
import { afterTest, describe, test } from '@dxos/test';

import { setGlobalAutomergePreference } from './automerge-preference';
import {
  LEGACY_TEXT_TYPE,
  TextObject,
  TypedObject,
  isAutomergeObject,
  isActualTypedObject,
  getTextContent,
} from './object';
import { Filter } from './query';
import { type SerializedSpace, Serializer } from './serializer';
import { createDatabase } from './testing';
import { Contact } from './tests/proto';

describe('Serializer', () => {
  test('Basic', async () => {
    const serializer = new Serializer();

    let data: SerializedSpace;

    {
      const { db } = await createDatabase();
      const obj = new TypedObject();
      obj.title = 'Test';
      db.add(obj);
      await db.flush();
      expect(db.objects).to.have.length(1);

      data = await serializer.export(db);
      expect(data.objects).to.have.length(1);
      expect(data.objects[0]).to.deep.include({
        '@id': obj.id,
        '@meta': { keys: [] },
        title: 'Test',
      });
    }

    {
      const { db } = await createDatabase();
      await serializer.import(db, data);

      const { objects } = db.query();
      expect(objects).to.have.length(1);
      expect(objects[0].title).to.eq('Test');
    }
  });

  test('Nested objects', async () => {
    const serializer = new Serializer();

    let serialized: SerializedSpace;

    {
      const { db } = await createDatabase();
      const obj = new TypedObject({
        title: 'Main task',
        subtasks: [
          new TypedObject({
            title: 'Subtask 1',
          }),
          new TypedObject({
            title: 'Subtask 2',
          }),
        ],
        previous: new TypedObject({
          title: 'Previous task',
        }),
      });
      db.add(obj);
      await db.flush();
      expect(db.objects).to.have.length(4);

      serialized = await serializer.export(db);
      expect(serialized.objects).to.have.length(4);
    }

    {
      const { db } = await createDatabase();
      await serializer.import(db, serialized);

      const { objects } = db.query();
      expect(objects).to.have.length(4);
      const main = objects.find((object) => object.title === 'Main task')!;
      expect(main).to.exist;
      expect(main.subtasks).to.have.length(2);
      expect(main.subtasks[0]).to.be.instanceOf(TypedObject);
      expect(main.subtasks[0].title).to.eq('Subtask 1');
      expect(main.subtasks[1]).to.be.instanceOf(TypedObject);
      expect(main.subtasks[1].title).to.eq('Subtask 2');
      expect(main.previous).to.be.instanceOf(TypedObject);
      expect(main.previous.title).to.eq('Previous task');
    }
  });

  test('Text', async () => {
    const serializer = new Serializer();

    let data: SerializedSpace;
    const content = 'Hello world!';
    {
      const { db } = await createDatabase();
      const text = new TextObject(content);
      db.add(text);
      await db.flush();
      expect(getTextContent(text)).to.deep.eq(content);
      expect(db.objects).to.have.length(1);

      data = await serializer.export(db);
      expect(data.objects).to.have.length(1);
      expect(data.objects[0]).to.contain({
        '@id': text.id,
        content,
        kind: TextKind.PLAIN,
        field: 'content',
      });
      expect(data.objects[0]['@type']).to.contain({
        '@type': 'dxos.echo.model.document.Reference',
        itemId: 'dxos.Text.v0',
        protocol: 'protobuf',
        host: 'dxos.org',
      });
    }

    {
      const { db } = await createDatabase();
      await serializer.import(db, data);

      const { objects } = db.query(undefined, { models: ['*'] });
      expect(objects[0] instanceof TextObject).to.be.true;
      expect(objects).to.have.length(1);
      expect(getTextContent(objects[0] as any as TextObject)).to.deep.eq(content);
    }
  });

  test('Serialize object with schema', async () => {
    let data: SerializedSpace;
    const name = 'Dmytro Veremchuk';

    {
      const { db } = await createDatabase();
      const contact = new Contact({ name });
      db.add(contact);
      await db.flush();
      data = await new Serializer().export(db);
    }

    {
      const { db } = await createDatabase();
      await new Serializer().import(db, data);
      expect(db.objects).to.have.length(1);

      const {
        objects: [contact],
      } = db.query(Contact.filter());
      expect(contact.name).to.eq(name);
      expect(contact instanceof Contact).to.be.true;
      expect(contact.__typename).to.eq(Contact.schema.typename);
    }
  });
});

describe('Serializer from Hypergraph to Automerge', () => {
  test('transfer text to automerge', async () => {
    const serializer = new Serializer();

    let data: SerializedSpace;
    const content = 'Hello world!';

    {
      const { db } = await createDatabase();
      const text = new TextObject(content, undefined, undefined, { automerge: false });
      db.add(text);
      await db.flush();
      expect(text.text).to.deep.eq(content);
      expect(db.objects).to.have.length(1);
      expect(isAutomergeObject(text)).to.be.false;
      expect(text instanceof TextObject).to.be.true;

      data = await serializer.export(db);
      expect(data.objects).to.have.length(1);
      expect(data.objects[0]).to.contain({
        '@id': text.id,
        '@model': 'dxos.org/model/text',
        '@type': 'dxos.Text.v0',
        content,
        kind: TextKind.PLAIN,
        field: 'content',
      });
    }

    {
      setGlobalAutomergePreference(true);
      afterTest(() => setGlobalAutomergePreference(undefined));
      const { db } = await createDatabase();
      await serializer.import(db, data);

      const { objects } = db.query();
      expect(isAutomergeObject(objects[0])).to.be.true;
      expect(objects[0] instanceof TextObject).to.be.true;
      expect(objects).to.have.length(1);
      expect(objects[0][objects[0].field]).to.deep.eq(content);
    }
  });

  test('transfer object to automerge', async () => {
    const serializer = new Serializer();

    let serialized: SerializedSpace;

    {
      const { db } = await createDatabase();
      const obj = new TypedObject(
        {
          title: 'Main task',
          subtasks: [
            new TypedObject({ title: 'Subtask 1' }, { automerge: false }),
            new TypedObject({ title: 'Subtask 2' }, { automerge: false }),
          ],
          assignee: new Contact({ name: 'Dmytro Veremchuk' }, { automerge: false }),
        },
        { automerge: false },
      );
      db.add(obj);

      const yjs = new TextObject(undefined, undefined, undefined, { automerge: false });
      yjs.doc!.transact(() => {
        const yMap = yjs.doc!.getMap('records');
        yMap.set('one', { id: 'one', title: 'One' });
        yMap.set('two', { id: 'two', title: 'Two' });
      });
      db.add(yjs);

      await db.flush();
      expect(db.objects).to.have.length(5);
      expect(db.objects.every((object) => !isAutomergeObject(object))).to.be.true;
      serialized = await serializer.export(db);
      expect(serialized.objects).to.have.length(5);
    }

    {
      const { db } = await createDatabase();
      await serializer.import(db, serialized);

      const { objects } = db.query();
      expect(objects).to.have.length(5);
      const main = objects.find((object) => object.title === 'Main task')!;
      expect(main).to.exist;
      expect(main.subtasks).to.have.length(2);
      expect(main.assignee instanceof Contact).to.be.true;
      expect(db.objects.every((object) => isAutomergeObject(object))).to.be.true;
      expect(db.objects.every((object) => !isActualTypedObject(object))).to.be.true;

      expect(main.subtasks[0]).to.be.instanceOf(TypedObject);
      expect(main.subtasks[0].title).to.eq('Subtask 1');
      expect(main.subtasks[1]).to.be.instanceOf(TypedObject);
      expect(main.subtasks[1].title).to.eq('Subtask 2');
      expect(main.assignee.name).to.eq('Dmytro Veremchuk');

      const [yjs] = db.query(Filter.typename(LEGACY_TEXT_TYPE)).objects;
      expect(yjs.records.one.title).to.eq('One');
      expect(yjs.records.two.title).to.eq('Two');
    }
  });
});
