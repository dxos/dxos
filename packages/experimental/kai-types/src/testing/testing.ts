//
// Copyright 2022 DXOS.org
//

import { faker } from '@faker-js/faker';
import add from 'date-fns/add';
import roundToNearestMinutes from 'date-fns/roundToNearestMinutes';
import { schema } from 'prosemirror-schema-basic';
import { prosemirrorToYXmlFragment } from 'y-prosemirror';

import { Document } from '@braneframe/types';
import { EchoDatabase, Text } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';
import { stripUndefinedValues } from '@dxos/util';

import { cities } from './data';
import { Contact, Event, Message, Organization, Note, Project, Task } from '../proto';

// TODO(burdon): Factor out all testing deps (and separately testing protos).

export type MinMax = { min: number; max: number } | number;

export const range = (range: MinMax) => Array.from({ length: faker.number.int(range as any) });

export type GeneratorOptions = {
  organizations: MinMax;
  projects: MinMax;
  tasks: MinMax;
  contacts: MinMax;
  events: MinMax;
  documents: MinMax;
  messages: MinMax;
};

export class Generator {
  constructor(
    private readonly _db: EchoDatabase,
    private readonly _options: GeneratorOptions = {
      organizations: { min: 1, max: 3 },
      projects: { min: 1, max: 2 },
      tasks: { min: 1, max: 8 },
      contacts: { min: 20, max: 30 },
      events: { min: 20, max: 40 },
      documents: { min: 2, max: 5 },
      messages: { min: 5, max: 10 },
    },
  ) {}

  async generate() {
    // Organizations.
    const organizations = await Promise.all(
      range(this._options.organizations).map(async () => {
        const organization = await this.createOrganization();

        // Address.
        const city = faker.helpers.arrayElement(cities);
        organization.address = {
          city: city.name,
          coordinates: {
            lat: city.coordinates[1],
            lng: city.coordinates[0],
          },
          // TODO(mykola): Add zip and state.
          state: 'NY',
          zip: '11205',
        };

        // Projects.
        await Promise.all(
          range(this._options.projects).map(async () => {
            const project = await this.createProject();
            organization.projects.push(project);

            // Tasks.
            const tasks = await Promise.all(
              range(this._options.tasks).map(async () => {
                // TODO(burdon): Fails add multiple.
                // project.tasks.push(await createTask(this._db));
                const task = await this.createTask();
                task.completed = faker.datatype.boolean();
                return task;
              }),
            );

            tasks.forEach((task: Task) => project.tasks.push(task));
            return project;
          }),
        );

        return organization;
      }),
    );

    // Contacts.
    const contacts = await Promise.all(
      range(this._options.contacts).map(async () => {
        const contact = await this.createContact();
        if (faker.number.int(10) > 7) {
          const organization = faker.helpers.arrayElement(organizations);
          organization.people.push(contact);
          contact.employer = organization;
        }

        return contact;
      }),
    );

    // Events.
    await Promise.all(
      range(this._options.events).map(async () => {
        const event = await this.createEvent();
        event.members.push(...faker.helpers.arrayElements(contacts, faker.number.int(2)));
        return event;
      }),
    );

    // Documents.
    await Promise.all(range(this._options.documents).map(async () => this.createDocument()));

    // Messages.
    await Promise.all(
      range(this._options.messages).map(async () => {
        const contact = faker.helpers.arrayElement(contacts);
        return this.createMessage(faker.number.int(10) > 6 ? contact : undefined);
      }),
    );

    // Chat.
    await Promise.all(
      range(this._options.messages).map(async () => {
        const contact = faker.helpers.arrayElement(contacts);
        return this.createMessage(contact, 'dxos.module.frame.chat', 1);
      }),
    );
  }

  createOrganization = async () => {
    const organization = createOrganization();
    const projects = await Promise.all(range(3).map(() => this.createProject()));
    projects.forEach((project) => organization.projects.push(project));
    return await this._db.add(organization);
  };

  createProject = async (tag?: string) => {
    return await this._db.add(createProject(tag));
  };

  createTask = async () => {
    const { objects: contacts } = this._db.query(Contact.filter());
    const contact =
      faker.datatype.boolean() && contacts.length ? contacts[Math.floor(Math.random() * contacts.length)] : undefined;

    return await this._db.add(createTask(contact));
  };

  createContact = async () => {
    return await this._db.add(createContact());
  };

  createEvent = async () => {
    return await this._db.add(createEvent());
  };

  createDocument = async () => {
    const document = await this._db.add(createDocument());
    createTextObjectContent(document.content, 5);
    return document;
  };

  createNote = async () => {
    const document = await this._db.add(createNote());
    document.content = new Text(faker.lorem.sentence(), TextKind.RICH);
    return document;
  };

  createMessage = async (from?: Contact, resolver?: string, recent?: number) => {
    return await this._db.add(createMessage(from, resolver, recent));
  };
}

// TODO(burdon): Replace with `new Text(str)` (and remove pm deps).
export const createTextObjectContent = (content: Text, sentences = 5, text?: string) => {
  const paragraphs = range({ min: 1, max: 5 }).flatMap(() => [
    schema.node('paragraph', null, [schema.text(text ?? faker.lorem.sentences(sentences))]),
  ]);

  // https://prosemirror.net/docs/guide/#doc
  const doc = schema.node('doc', null, paragraphs);

  // TODO(burdon): Cannot update until saved.
  // TODO(burdon): Configure 'content' field.
  // https://docs.yjs.dev/api/shared-types/y.xmlfragment
  const fragment = content.doc!.getXmlFragment('content');
  prosemirrorToYXmlFragment(doc, fragment);
};

//
// Constructors.
//

export const tags = ['inbox', 'active', 'scheduled', 'complete'];

export const createOrganization = () => {
  return new Organization({
    name: faker.company.name(),
    website: faker.internet.url(),
    description: faker.lorem.sentences(2),
  });
};

export const createProject = (tag?: string) => {
  return new Project({
    title: faker.commerce.productAdjective() + ' ' + faker.commerce.product(),
    url: faker.internet.url(),
    tag: tag ?? faker.helpers.arrayElement(tags),
  });
};

export const createTask = (assignee?: Contact) => {
  return new Task({
    title: faker.lorem.sentence(2),
    assignee,
  });
};

export const createContact = () => {
  return new Contact({
    name: faker.person.fullName(),
    email: faker.datatype.boolean() ? faker.internet.email() : undefined,
    username: faker.number.int(10) > 2 ? '@' + faker.internet.userName() : undefined,
    phone: faker.datatype.boolean() ? faker.phone.number() : undefined,
    address: faker.datatype.boolean()
      ? {
          city: faker.location.city(),
          state: faker.location.state({ abbreviated: true }),
          zip: faker.location.zipCode(),
          coordinates: { lat: Number(faker.location.latitude()), lng: Number(faker.location.longitude()) },
        }
      : undefined,
    tag: faker.number.int(10) > 7 ? faker.helpers.arrayElement(tags) : undefined,
  });
};

export const createEvent = () => {
  const start = roundToNearestMinutes(faker.date.soon(21, add(new Date(), { days: -7 })), { nearestTo: 30 });
  const end = add(start, { hours: 1 });

  return new Event({
    title: faker.lorem.sentence(3),
    start: start.toISOString(),
    end: end.toISOString(),
  });
};

export const createDocument = () => {
  const document = new Document();
  document.title = faker.lorem.sentence(3);
  document.content = new Text('', TextKind.RICH);
  return document;
};

export const createNote = () => {
  return new Note({ title: faker.lorem.words(2) });
};

// TODO(burdon): Error if directly setting value with undefined.
// TODO(burdon): Use constructors above.
export const createMessage = (from?: Contact, resolver?: string, recent = 14) => {
  return new Message({
    source: stripUndefinedValues({
      // TODO(burdon): Strip keys in TypedObject constructor.
      resolver,
      guid: PublicKey.random().toHex(),
    }),
    // TODO(burdon): Batch some messages closer.
    date: faker.date.recent(recent, new Date()).toISOString(),
    // TODO(burdon): This breaks kai.
    // to: [
    //   new Message.Recipient({
    //     email: faker.internet.email(),
    //     name: faker.number.int(10) > 6 ? faker.person.fullName() : undefined
    //   })
    // ],
    from: new Message.Recipient({
      email: from?.email ?? faker.internet.email(),
      name: from?.name ?? faker.person.fullName(),
      contact: from,
    }),
    subject: faker.lorem.sentence(),
    body: faker.lorem.paragraphs(3),
  });
};
