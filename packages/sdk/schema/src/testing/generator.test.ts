//
// Copyright 2024 DXOS.org
//

import { Effect } from 'effect';
import { describe, test } from 'vitest';

import { Filter } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { getSchemaTypename, type JsonProp, type S, type JsonPath } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { faker } from '@dxos/random';

import { createArrayPipeline, createObjectPipeline } from './generator';
import { ContactType, createReferenceProperty, OrgType, ProjectType } from './types';

faker.seed(1);

type TypeSpec = {
  type: S.Schema<any>;
  count: number;
};

describe('Generator', () => {
  test('generate objects', async ({ expect }) => {
    const builder = new EchoTestBuilder();
    const { db } = await builder.createDatabase();
    db.graph.schemaRegistry.addSchema([OrgType, ProjectType, ContactType]);

    const spec: TypeSpec[] = [
      { type: OrgType, count: 1 },
      { type: ProjectType, count: 1 },
      { type: ContactType, count: 3 },
    ];

    for (const { type, count } of spec) {
      const pipeline = createObjectPipeline(type, db);
      const objects = await Effect.runPromise(createArrayPipeline(count, pipeline));
      expect(objects).to.have.length(count);
      await db.flush();
    }
  });

  test('generate objects with references', async ({ expect }) => {
    const builder = new EchoTestBuilder();
    const { db } = await builder.createDatabase();

    const org = db.schemaRegistry.addSchema(OrgType);
    const contact = createReferenceProperty(
      db.schemaRegistry.addSchema(ContactType),
      'employer' as JsonProp,
      org.typename,
      'name' as JsonPath,
    );

    const spec: TypeSpec[] = [
      { type: org, count: 5 },
      { type: contact, count: 10 },
    ];

    for (const { type, count } of spec) {
      const pipeline = createObjectPipeline(type, db);
      const objects = await Effect.runPromise(createArrayPipeline(count, pipeline));
      expect(objects).to.have.length(count);
      await db.flush();
      log.info('created', { type: getSchemaTypename(type), count });
    }

    const { objects } = await db.query(Filter.schema(contact)).run();
    for (const obj of objects) {
      console.log(JSON.parse(JSON.stringify({ name: obj.name, employer: obj.employer?.name })));
    }
  });
});
