//
// Copyright 2022 DXOS.org
//

import add from 'date-fns/add';
import roundToNearestMinutes from 'date-fns/roundToNearestMinutes';
import faker from 'faker';
import { schema } from 'prosemirror-schema-basic';
import { prosemirrorToYXmlFragment } from 'y-prosemirror';

import { EchoDatabase, TextObject } from '@dxos/echo-schema';

import { cities } from './data';
import { Contact, Document, Event, Organization, Note, Project, Task } from './gen/schema';

// TODO(burdon): Factor out all testing deps (and separately testing protos).

export type MinMax = { min: number; max: number } | number;

export const range = (range: MinMax) => Array.from({ length: faker.datatype.number(range as any) });

export type GeneratorOptions = {
  organizations: MinMax;
  projects: MinMax;
  tasks: MinMax;
  contacts: MinMax;
  events: MinMax;
  documents: MinMax;
  notes: MinMax;
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
      documents: { min: 1, max: 3 },
      notes: { min: 8, max: 16 }
    }
  ) {}

  async generate() {
    // Organizations.
    const organizations = await Promise.all(
      range(this._options.organizations).map(async () => {
        const organization = await this.createOrganization();

        // Address.
        const city = faker.random.arrayElement(cities);
        organization.address = {
          city: city.name,
          coordinates: {
            lat: city.coordinates[1],
            lng: city.coordinates[0]
          },
          // TODO (mykola): Add zip and state.
          state: 'NY',
          zip: '11205'
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
              })
            );

            tasks.forEach((task: Task) => project.tasks.push(task));
            return project;
          })
        );

        return organization;
      })
    );

    // Contacts.
    const contacts = await Promise.all(
      range(this._options.contacts).map(async () => {
        const contact = await this.createContact();
        if (faker.datatype.number(10) > 7) {
          const organization = faker.random.arrayElement(organizations);
          organization.people.push(contact);
        }

        return contact;
      })
    );

    // Events.
    await Promise.all(
      range(this._options.events).map(async () => {
        const event = await this.createEvent();
        event.members.push(...faker.random.arrayElements(contacts, faker.datatype.number(2)));
        return event;
      })
    );

    // Documents.
    await Promise.all(range(this._options.documents).map(async () => this.createDocument()));

    // Notes.
    await Promise.all(range(this._options.notes).map(async () => this.createNote()));
  }

  createOrganization = async () => {
    const organization = createOrganization();
    const projects = await Promise.all(range(3).map(() => this.createProject()));
    projects.forEach((project) => organization.projects.push(project));
    return await this._db.save(organization);
  };

  createProject = async (tag?: string) => {
    const project = createProject(tag);
    return await this._db.save(project);
  };

  createTask = async () => {
    const contacts = this._db.query(Contact.filter()).getObjects();
    const contact =
      faker.datatype.boolean() && contacts.length ? contacts[Math.floor(Math.random() * contacts.length)] : undefined;

    const task = createTask(contact);
    return await this._db.save(task);
  };

  createContact = async () => {
    const contact = createContact();
    return await this._db.save(contact);
  };

  createEvent = async () => {
    const event = createEvent();
    return await this._db.save(event);
  };

  createDocument = async () => {
    const document = createDocument();
    await this._db.save(document);
    createTextObjectContent(document.content, 5);
    return document;
  };

  createNote = async () => {
    const document = createNote();
    await this._db.save(document);
    createTextObjectContent(document.content, 1);
    return document;
  };
}

// TODO(burdon): TextObject initial state isn't replicated.
// TODO(burdon): Factor out into TextModel.
const createTextObjectContent = (content: TextObject, sentences = 5) => {
  // https://prosemirror.net/docs/guide/#doc
  const doc = schema.node(
    'doc',
    null,
    range({ min: 1, max: 5 }).flatMap(() => [
      schema.node('paragraph', null, [schema.text(faker.lorem.sentences(sentences))]),
      schema.node('paragraph')
    ])
  );

  // TODO(burdon): Cannot update until saved.
  // TODO(burdon): Configure 'content' field.
  // https://docs.yjs.dev/api/shared-types/y.xmlfragment
  const fragment = content.doc!.getXmlFragment('content');
  prosemirrorToYXmlFragment(doc, fragment);
};

//
// Constructors.
//

export const tags = ['red', 'green', 'blue', 'orange'];

export const createOrganization = () => {
  return new Organization({
    name: faker.company.companyName(),
    website: faker.internet.url(),
    description: faker.lorem.sentences(2)
  });
};

export const createProject = (tag?: string) => {
  return new Project({
    title: faker.commerce.productAdjective() + ' ' + faker.commerce.product(),
    description: new TextObject(),
    url: faker.internet.url(),
    tag: tag ?? faker.random.arrayElement(tags)
  });
};

export const createTask = (assignee?: Contact) => {
  return new Task({
    title: faker.lorem.sentence(2),
    assignee
  });
};

export const createContact = () => {
  return new Contact({
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
};

export const createEvent = () => {
  const start = roundToNearestMinutes(faker.date.soon(21, add(new Date(), { days: -7 })), { nearestTo: 30 });
  const end = add(start, { hours: 1 });

  return new Event({
    title: faker.lorem.sentence(3),
    start: start.toISOString(),
    end: end.toISOString()
  });
};

export const createDocument = () => {
  const document = new Document();
  document.title = faker.lorem.sentence(3);
  document.content = new TextObject();
  return document;
};

export const createNote = () => {
  const note = new Note();
  note.title = faker.lorem.words(2);
  note.content = new TextObject();
  return note;
};
