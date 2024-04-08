//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { Contact, Container, Task } from './proto';
import { toJsonSchema } from '../effect/json-schema';

// TODO(burdon): Test with database.
// TODO(burdon): Implement Task.from to deserialize JSON string.

describe('static schema', () => {
  test('keys', () => {
    const contact = new Contact({ name: 'Test User' });
    expect(contact.id).to.exist;
    expect(Object.keys(contact).length).to.eq(6);
    contact.email = 'test@example.com';

    // TODO(burdon): Address should be auto-created?
    // contact.address.zip = '11205';

    // TODO(burdon): Test after saved with test database.
    expect(contact.id).to.be.a('string'); // TODO(burdon): Expose as property.
  });

  test('json', () => {
    const contact = new Contact();
    contact.name = 'User 1';
    expect(contact.name).to.eq('User 1');
    expect(contact.toJSON()).to.contain({ name: 'User 1' });

    const task1 = new Task();
    task1.title = 'Task 1';
    expect(task1.title).to.eq('Task 1');
    expect(task1.toJSON()).to.contain({ title: 'Task 1' });

    task1.assignee = contact;
    expect(task1.assignee.name).to.eq('User 1');
    expect(task1.toJSON()).to.deep.contain({
      title: 'Task 1',
      assignee: {
        '@type': 'dxos.echo.model.document.Reference',
        itemId: contact.id,
        protocol: null,
        host: null,
      },
    });
    expect(JSON.parse(JSON.stringify(task1, null, 4))).to.deep.contain({
      '@backend': 'automerge',
      '@id': task1.id,
      '@type': {
        '@type': 'dxos.echo.model.document.Reference',
        itemId: task1.__typename,
        protocol: 'protobuf',
        host: 'dxos.org',
      },
      '@meta': { keys: [] },
      description: {
        '@type': 'dxos.echo.model.document.Reference',
        itemId: task1.description.id,
        host: null,
        protocol: null,
      },
      subTasks: [],
      todos: [],
      title: 'Task 1',
      assignee: {
        '@type': 'dxos.echo.model.document.Reference',
        itemId: contact.id,
        protocol: null,
        host: null,
      },
    });
  });

  test('json with recursion', () => {
    const contact = new Contact({ name: 'User 1' });
    contact.tasks.push(new Task({ title: 'Task 1', assignee: contact }));
    contact.tasks.push(new Task({ title: 'Task 2', assignee: contact }));

    expect(contact.toJSON()).to.deep.eq({
      '@backend': 'automerge',
      '@id': contact.id,
      '@type': {
        '@type': 'dxos.echo.model.document.Reference',
        host: 'dxos.org',
        itemId: contact.__typename,
        protocol: 'protobuf',
      },
      '@meta': { keys: [] },
      name: 'User 1',
      tasks: [
        {
          '@type': 'dxos.echo.model.document.Reference',
          itemId: contact.tasks[0].id,
          protocol: null,
          host: null,
        },
        {
          '@type': 'dxos.echo.model.document.Reference',
          itemId: contact.tasks[1].id,
          protocol: null,
          host: null,
        },
      ],
    });
  });

  test('destructuring', () => {
    const contact = new Contact({ name: 'user', address: { coordinates: { lat: -90, lng: 10 } } });
    const { lat, lng } = contact.address.coordinates!;
    expect({ lat, lng }).to.deep.eq({ lat: -90, lng: 10 });
  });

  test('enums', () => {
    const container = new Container({ records: [{ type: Container.Record.Type.PERSONAL }] });
    expect(container.records[0].type).to.eq(Container.Record.Type.PERSONAL);
  });

  test('convert to JSON schema', () => {
    const contact = new Contact();
    const schema = toJsonSchema(contact.__schema!);
    expect(Object.keys(schema.properties!)).to.have.length(6);
  });
});
