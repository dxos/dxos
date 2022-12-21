//
// Copyright 2022 DXOS.org
//

import { EchoSchema, EchoObjectBase, TypeFilter, OrderedSet } from '@dxos/echo-db2';

const schemaJson =
  '{"nested":{"kai":{"nested":{"example":{"nested":{"tasks":{"nested":{"Project":{"options":{"(object)":true},"fields":{"title":{"type":"string","id":1},"tasks":{"rule":"repeated","type":"Task","id":3}}},"Task":{"options":{"(object)":true},"fields":{"id":{"type":"string","id":1},"title":{"type":"string","id":2},"count":{"type":"int32","id":3},"completed":{"type":"bool","id":4},"assignee":{"type":"Contact","id":5}}},"Person":{"options":{"(object)":true},"fields":{"id":{"type":"string","id":1},"name":{"type":"string","id":2}}},"Contact":{"options":{"(object)":true},"fields":{"name":{"type":"string","id":1},"id":{"type":"string","id":2},"email":{"type":"string","id":3}}}}}}}}}}}';
export const schema = EchoSchema.fromJson(schemaJson);

export class Project extends EchoObjectBase {
  static readonly type = schema.getType('kai.example.tasks.Project');

  static filter(opts?: { title?: string; tasks?: OrderedSet<Task> }): TypeFilter<Project> {
    return Project.type.createFilter(opts);
  }

  constructor(opts?: { title?: string; tasks?: OrderedSet<Task> }) {
    super({ ...opts, '@type': Project.type.name }, Project.type);
  }

  declare title: string;
  declare tasks: OrderedSet<Task>;
}
schema.registerPrototype(Project);

export class Task extends EchoObjectBase {
  static readonly type = schema.getType('kai.example.tasks.Task');

  static filter(opts?: { title?: string; count?: number; completed?: boolean; assignee?: Contact }): TypeFilter<Task> {
    return Task.type.createFilter(opts);
  }

  constructor(opts?: { title?: string; count?: number; completed?: boolean; assignee?: Contact }) {
    super({ ...opts, '@type': Task.type.name }, Task.type);
  }

  declare title: string;
  declare count: number;
  declare completed: boolean;
  declare assignee: Contact;
}
schema.registerPrototype(Task);

export class Person extends EchoObjectBase {
  static readonly type = schema.getType('kai.example.tasks.Person');

  static filter(opts?: { name?: string }): TypeFilter<Person> {
    return Person.type.createFilter(opts);
  }

  constructor(opts?: { name?: string }) {
    super({ ...opts, '@type': Person.type.name }, Person.type);
  }

  declare name: string;
}
schema.registerPrototype(Person);

export class Contact extends EchoObjectBase {
  static readonly type = schema.getType('kai.example.tasks.Contact');

  static filter(opts?: { name?: string; email?: string }): TypeFilter<Contact> {
    return Contact.type.createFilter(opts);
  }

  constructor(opts?: { name?: string; email?: string }) {
    super({ ...opts, '@type': Contact.type.name }, Contact.type);
  }

  declare name: string;
  declare email: string;
}
schema.registerPrototype(Contact);
