//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { Contact, Container, Task } from './proto';

// TODO(burdon): Test with database.
// TODO(burdon): Implement Task.from to deserialize JSON string.

describe('schema', () => {
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
    expect(task1.toJSON()).to.deep.contain({ title: 'Task 1', assignee: { '@id': contact.id } });
    expect(JSON.stringify(task1)).to.equal(
      JSON.stringify({
        '@id': task1.id,
        '@type': task1.__typename,
        '@model': 'dxos:model/document',
        subTasks: [],
        description: { '@id': task1.description.id },
        title: 'Task 1',
        assignee: { '@id': contact.id }
      })
    );
  });

  test('json with recursion', () => {
    const contact = new Contact({ name: 'User 1' });
    contact.tasks.push(new Task({ title: 'Task 1', assignee: contact }));
    contact.tasks.push(new Task({ title: 'Task 2', assignee: contact }));

    expect(contact.toJSON()).to.deep.eq({
      '@id': contact.id,
      '@type': contact.__typename,
      '@model': 'dxos:model/document',
      name: 'User 1',
      tasks: [
        {
          '@id': contact.tasks[0].id
        },
        {
          '@id': contact.tasks[1].id
        }
      ]
    });
  });

  test('destructuring', () => {
    const contact = new Contact({ name: 'user', address: { coordinates: { lat: -90, lng: 10 } } });
    const { lat, lng } = contact.address.coordinates!;
    expect({ lat, lng }).to.deep.eq({ lat: -90, lng: 10 });
  });

  test('fields', () => {
    expect(Contact.type.fields).to.deep.eq([
      { name: 'name', type: { kind: 'string' } },
      { name: 'username', type: { kind: 'string' } },
      { name: 'email', type: { kind: 'string' } },
      { name: 'address', type: { kind: 'record', objectType: 'example.test.Contact.Address' } },
      {
        name: 'tasks',
        type: {
          kind: 'array',
          elementType: { kind: 'ref', objectType: 'example.test.Task', modelType: 'dxos:model/document' }
        }
      },
      { name: 'currentLocation', type: { kind: 'record', objectType: 'example.test.Contact.Address.LatLng' } }
    ]);
  });

  test('enums', () => {
    const container = new Container({ objects: [{ type: Container.Record.Type.BRAINFRAME }] });
    expect(container.objects[0].type).to.eq(Container.Record.Type.BRAINFRAME);
  });
});
