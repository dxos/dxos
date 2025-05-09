import { Schema } from 'effect';
/// ISSUE(dm): Is it okay to have one entry point for all of the types like object id and type definitions and will it prohibit us from building isolated storybooks that don't pull in echo? DX vs tree shaking.
// So that type and relation API should be separate from echo database API.
// Potentially, some part of the database API could be included in there. Things like query builders. So only the declarative API, not the actual execution layer.
import { test } from 'vitest';
import { Type } from '.';

declare const create: any;
declare const Relation: any;
declare const setupDb: any;
declare const Filter: any;
declare const Query: any;

///

const Contact = Schema.Struct({
  // ISSUE(dm): Forcing explicit object IDs for every schema?
  id: Type.ObjectId,
  name: Schema.String,
  // ISSUE(dm): Reconcile "type" and "typename" i.e. the dxn and the name of the type.
}).pipe(Type.def({ typename: 'dxos.org/type/Contact', version: '0.1.0' }));

const Org = Schema.Struct({
  id: Type.ObjectId,
  name: Schema.String,
}).pipe(Type.def({ typename: 'dxos.org/type/Org', version: '0.1.0' }));

const WorksFor = Schema.Struct({
  id: Type.ObjectId,
  since: Schema.String,
  ...Relation.connects(Contact, Org),
  // ISSUE(dm): "dxos.org/type" vs "dxos.org/relation"
}).pipe(Relation.def({ typename: 'dxos.org/type/WorksFor', version: '0.1.0' }));

test('db', async () => {
  const db = setupDb();

  const contact = db.add(
    create(Contact, {
      name: 'John Doe',
    }),
  );

  const org = db.add(
    create(Org, {
      name: 'Acme Inc.',
    }),
  );

  const worksFor = db.add(
    create(WorksFor, {
      since: '2021-01-01',
      ...Relation.make(contact, org),
      ...Type.meta({
        keys: [],
      }),
    }),
  );

  {
    // ISSUE(dm): Don't like get API. This won't return an object if it's not loaded.
    const contact2 = db.get(contact.id);
    const org2 = db.get(org.id);
    const worksFor2 = db.get(worksFor.id);
    // ISSUE(dm): `db.ref(dxn).target`
  }

  {
    const contact2 = await db.query(Query.type(Contact, { id: contact.id }).related(WorksFor)).run();
  }

  {
    const contact2 = await db
      .query(
        Query.build(() => {
          const contact = Query.Type(Contact);
          const org = Query.Type(Org);

          return Query.Match(contact.related(Query.Relation(WorksFor)).to(org))
            .return({
              contact,
              org,
            })
            .limit(100);
        }),
      )
      .run();
  }
});

/*

Aspects:

- Identity -- has .id
- Type -- has [type] and [schema] getType getSchema
- Meta -- [meta] getMeta
- Deletion -- [deleted] isDeleted
- Relation -- has [source] and [target] getSource getTarget

ISSUE(dm): Define a base type that has Identity & Type & Meta & Deletion

*/

/*

Identifiers ontology:

- ObjectId -- identifies an object but doesn't specify how to locate it.
// ISSUE(dm): DXNs with @
- DXN -- identifies an object and a way to locate it.
- URI -- relative or absolute ref to an object that can be resolved in a certain context.
*/

/*
- Open PR
- ISSUE(wj): Conversion between `create` <-> `live`
- ISSUE(dm): Readonly APIs
- ISSUE(burdon): Make source and target immutable.
- ISSUE(burdon): Add `created`, `updated` (timestamps), `author`, etc to meta
- ISSUE(burdon): Support dates
- ISSUE(wj): How to get a DXN of an object. `getDXN`
- ISSUE(dm): For cross-schema references, e.g. relation schema referencing a type schema, do DXN specify the target schema version or not?

*/
