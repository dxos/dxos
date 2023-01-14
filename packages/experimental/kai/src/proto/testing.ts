//
// Copyright 2022 DXOS.org
//

import faker from 'faker';

import { EchoDatabase, TextObject } from '@dxos/echo-schema';

import { cities } from './data';
import { Contact, Organization, Project, Task } from './gen/schema';

// TODO(burdon): Don't save inside utils.

type MinMax = { min: number; max: number };

type GeneratorOptions = {
  organizations: MinMax;
  projects: MinMax;
  tasks: MinMax;
  contacts: MinMax;
};

export class Generator {
  constructor(
    private readonly _db: EchoDatabase,
    private readonly _options: GeneratorOptions = {
      organizations: { min: 1, max: 3 },
      projects: { min: 1, max: 2 },
      tasks: { min: 1, max: 8 },
      contacts: { min: 3, max: 5 }
    }
  ) {}

  async generate() {
    // Organizations.
    await Promise.all(
      Array.from({ length: faker.datatype.number(this._options.organizations) }).map(async () => {
        const organization = await createOrganization(this._db);

        // Address.
        const city = faker.random.arrayElement(cities);
        organization.address = {
          city: city.name,
          coordinates: {
            lat: city.coordinates[1],
            lng: city.coordinates[0]
          },
          // TODO (mykola): Add zip and state.
          zip: '????',
          state: '????'
        };

        // Contacts.
        await Promise.all(
          Array.from({ length: faker.datatype.number(this._options.contacts) }).map(async () => {
            const contact = await createContact(this._db);
            organization.people.push(contact);
            return contact;
          })
        );

        // Projects.
        await Promise.all(
          Array.from({ length: faker.datatype.number(this._options.projects) }).map(async () => {
            const project = await createProject(this._db);
            organization.projects.push(project);

            // Tasks.
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
      })
    );
  }
}

export const tags = ['red', 'green', 'blue', 'orange'];

export const createOrganization = async (db: EchoDatabase) => {
  const organization = new Organization({
    name: faker.company.companyName()
  });

  const projects = await Promise.all(Array.from({ length: faker.datatype.number(3) }).map(() => createProject(db)));
  projects.forEach((project) => organization.projects.push(project));

  return await db.save(organization);
};

export const createProject = async (db: EchoDatabase, tag?: string) => {
  const project = new Project({
    title: faker.commerce.productAdjective() + ' ' + faker.commerce.product(),
    description: new TextObject(),
    tag: tag ?? faker.random.arrayElement(tags)
    // tags: [faker.random.arrayElement(tags)] // TODO(burdon): Implement constructor.
  });

  // TODO(burdon): Not working.
  // project.tags.add(faker.random.arrayElement(tags));

  // TODO(burdon): Not working.
  project.description.model?.insert('Hello', 0);

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
          zip: faker.address.zipCode(),
          coordinates: { lat: Number(faker.address.latitude()), lng: Number(faker.address.longitude()) }
        }
      : undefined
  });

  return await db.save(contact);
};
