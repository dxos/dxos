//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import type { Faker } from '@faker-js/faker';

import { Document as DocumentType, Schema as SchemaType, Table as TableType } from '@braneframe/types';
import { Space, Text } from '@dxos/client/echo';
import { Expando } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { range } from '@dxos/util';

export class Generator {
  private _faker?: Faker;

  constructor(private readonly _space: Space) {
    invariant(this._space);
  }

  async initialize() {
    // TODO(burdon): Async import Generator instead?
    const { faker } = await import('@faker-js/faker');
    this._faker = faker;
    return this;
  }

  // TODO(burdon): Silent fail if try to set __foo property.
  createTables(options = { organizations: 50, people: 200 }) {
    // TODO(burdon): Get or create schema.
    const org = new SchemaType({
      props: [
        {
          id: 'name',
          type: SchemaType.PropType.STRING,
        },
        {
          id: 'website',
          type: SchemaType.PropType.STRING,
        },
        {
          id: 'active',
          type: SchemaType.PropType.BOOLEAN,
        },
      ],
    });

    this._space.db.add(
      new TableType({
        title: 'Organizations',
        schema: org,
      }),
    );

    const organizations = this._faker!.helpers.uniqueArray(faker.company.name, options.organizations).map(
      (name: string) => {
        const obj = new Expando({ name, website: this._faker!.internet.url() });
        console.log(obj);
        obj.meta.schema = org;
        console.log('!!!', obj);
        return this._space.db.add(obj);
      },
    );

    const person = new SchemaType({
      props: [
        {
          id: 'name',
          type: SchemaType.PropType.STRING,
        },
        {
          id: 'email',
          type: SchemaType.PropType.STRING,
        },
        // {
        //   id: 'org',
        //   type: SchemaType.PropType.REF,
        //   ref: org,
        //   refProp: 'name',
        // },
      ],
    });

    this._space.db.add(
      new TableType({
        title: 'People',
        schema: person,
      }),
    );

    const people = this._faker!.helpers.uniqueArray(faker.person.fullName, options.people).map((name: string) => {
      const obj = new Expando({
        name,
        email: this._faker?.internet.email(),
        org: this._faker!.helpers.arrayElement(organizations),
      });
      obj.meta.schema = person;
      return this._space.db.add(obj);
    });

    console.log('created', { organizations: organizations.length, people: people.length });
  }

  createObject({ type = DocumentType.type.name, createContent = false } = {}) {
    log('update', { type });
    switch (type) {
      case DocumentType.type.name: {
        // TODO(burdon): Factor out generators.
        const title = this._faker!.lorem.sentence();
        const content = createContent
          ? range(this._faker!.number.int({ min: 2, max: 8 }))
              .map(() => this._faker!.lorem.sentences(this._faker!.number.int({ min: 2, max: 16 })))
              .join('\n\n')
          : '';

        this._space.db.add(new DocumentType({ title, content: new Text(content) }));
        break;
      }
    }
  }

  async updateObject(type = DocumentType.type.name) {
    switch (type) {
      case DocumentType.type.name: {
        const { objects } = this._space.db.query(DocumentType.filter());
        if (objects.length) {
          // TODO(burdon): Standardize faker deps.
          const object = this._faker!.helpers.arrayElement(objects);
          const text = object.content.text;
          // TODO(burdon): Insert, update, or delete.
          const idx = text.lastIndexOf(' ', this._faker!.number.int({ min: 0, max: text.length }));
          if (idx !== -1) {
            object.content.model?.insert(' ' + this._faker!.lorem.word(), idx);
          } else {
            object.content.model?.insert(this._faker!.lorem.sentence(), 0);
          }
        }

        break;
      }
    }

    this._space.internal.db.commitBatch();
    // TODO(burdon): Make optional.
    await this._space.db.flush();
  }
}
