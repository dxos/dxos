//
// Copyright 2022 DXOS.org
//

import faker from 'faker';

import { EchoDatabase, TextObject } from '@dxos/echo-schema';

import { Contact, Task } from '../proto';
import { Project } from './gen/schema';

// TODO(burdon): Don't save inside utils.

type MinMax = { min: number; max: number };

type GeneratorOptions = {
  projects: MinMax;
  tasks: MinMax;
  contacts: MinMax;
};

export class Generator {
  constructor(
    private readonly _db: EchoDatabase,
    private readonly _options: GeneratorOptions = {
      projects: { min: 1, max: 2 },
      tasks: { min: 1, max: 8 },
      contacts: { min: 3, max: 5 }
    }
  ) {}

  async generate() {
    await Promise.all(
      Array.from({ length: faker.datatype.number(this._options.contacts) }).map(async () => {
        return await createContact(this._db);
      })
    );

    await Promise.all(
      Array.from({ length: faker.datatype.number(this._options.projects) }).map(async () => {
        const project = await createProject(this._db);

        const tasks = await Promise.all(
          Array.from({ length: faker.datatype.number(this._options.tasks) }).map(async () => {
            // TODO(burdon): Fails add multiple.
            // project.tasks.push(await createTask(this._db));
            const task = await createTask(this._db);
            task.completed = faker.datatype.boolean();
            return task;
          })
        );

        tasks.forEach((task: Task) => project.tasks.push(task));

        return project;
      })
    );
  }
}

export const createProject = async (db: EchoDatabase) => {
  const project = new Project({
    title: faker.commerce.productAdjective() + ' ' + faker.commerce.product(),
    description: new TextObject()
  });

  return await db.save(project);
};

export const createTask = async (db: EchoDatabase) => {
  const contacts = db.query(Contact.filter()).getObjects();
  const contact =
    faker.datatype.boolean() && contacts.length ? contacts[Math.floor(Math.random() * contacts.length)] : undefined;

  const task = new Task({
    title: faker.lorem.sentence(2),
    assignee: contact
  });

  return await db.save(task);
};

export const createContact = async (db: EchoDatabase) => {
  const contact = new Contact({
    name: faker.name.findName(),
    email: faker.datatype.boolean() ? faker.internet.email() : undefined,
    username: faker.datatype.boolean() ? '@' + faker.internet.userName() : undefined,
    address: faker.datatype.boolean()
      ? {
          city: faker.address.city(),
          state: faker.address.stateAbbr(),
          zip: faker.address.zipCode()
        }
      : undefined
  });

  return await db.save(contact);
};
