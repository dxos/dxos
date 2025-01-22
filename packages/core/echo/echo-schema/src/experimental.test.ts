//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import { AST, S } from '@dxos/effect';

import { Format } from './formats';

// TODO(burdon): EchoSchema should preserve the order of properties.
// TODO(burdon): Type issue with Contact.employer ref (see Form.stories.tsx).
// TODO(burdon): Handle defaults.

const ObjectId = S.String;

const StoredObjectConfig = S.Struct({
  typename: S.String,
  version: S.String,
});

type StoredObjectConfig = S.Schema.Type<typeof StoredObjectConfig>;

// TODO(burdon): Replace TypedObject (just use annotations) on standard effect schema; Check HasId.
const StoredObject =
  <A>(config: StoredObjectConfig) =>
  (self: A) =>
    self;

const _create = <A, I, R>(schema: S.Schema<A, I, R>, values: Partial<A>): A => values as A;

class ObjectRef<T> {
  constructor(private readonly id: string) {}

  get obj(): T | undefined {
    return {} as T;
  }

  // TODO(burdon): follow link.
  async resolve(): Promise<T> {
    return {} as T;
  }
}

// TODO(burdon): Consider arrays of references.
const _r = <T>(obj: T | undefined) => new ObjectRef<T>(''); // Just simulates a ref.

describe.skip('experimental', () => {
  test('basic', async () => {
    const _OrgSchema = S.Struct({
      id: ObjectId, // TODO(burdon): Basic type defines optional ID. Low-level def: no dep on ech-schema.
      name: S.String,
      website: S.optional(Format.URL),
    }).pipe(
      StoredObject({
        typename: 'example.com/type/Org',
        version: '0.1.0',
      }),
      S.annotations({
        [AST.DescriptionAnnotationId]: 'An organization',
      }),
    );

    // const ContactSchema = S.Struct({
    //   id: ObjectId,
    //   name: S.String,
    //   email: S.optional(Format.Email),
    //   employer: S.optional(ref(OrgSchema)),
    // }).pipe(
    //   StoredObject({
    //     typename: 'example.com/type/Contact',
    //     version: '0.1.0',
    //   }),
    //   S.annotations({
    //     [AST.DescriptionAnnotationId]: 'A person',
    //   }),
    // );

    // type ContactType = S.Schema.Type<typeof ContactSchema>;
    // type OrgType = S.Schema.Type<typeof OrgSchema>;

    // const org = create(OrgSchema, { name: 'DXOS' });
    // const contact = create(ContactSchema, { name: 'Bot', employer: org });

    // const ref = contact.employer;
    // const ref = r(contact.employer);

    // contact.employer.obj?.name
    // {
    //   const name = ref.obj?.name;
    //   log.info('result', { name });
    // }
    // {
    //   const name = (await ref.resolve()).name;
    //   log.info('result', { name });
    // }

    // TODO(burdon): Queries.
    // db.query(ContactSchema).where({ employer: { name: 'DXOS' } }).run()
  });
});
