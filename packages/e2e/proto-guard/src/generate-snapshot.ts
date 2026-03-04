//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Client } from '@dxos/client';
import { Obj, Ref, Type } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { log } from '@dxos/log';
import { CreateEpochRequest } from '@dxos/protocols/proto/dxos/client/services';

import { SpacesDumper } from './space-json-dump';
import { Todo } from './types';
import { createConfig } from './util';

export const generateSnapshot = async (snapshotDir: string, dumpPath: string) => {
  const config = createConfig({ dataRoot: snapshotDir });
  const client = new Client({ config, types: [Todo, TestSchema.Expando] });
  await client.initialize();
  await client.halo.createIdentity({ displayName: 'My Identity' });
  const space = await client.spaces.create({ name: 'My Space' });
  await space.waitUntilReady();
  await seedData(client);
  await SpacesDumper.dumpSpaces(client, dumpPath);
  await client.destroy();
};

const seedData = async (client: Client) => {
  log.break();

  {
    // Create first space and data.
    const space = await client.spaces.create({ name: 'first-space' });
    await space.waitUntilReady();

    space.db.add(
      Obj.make(TestSchema.Expando, {
        value: 100,
        string: 'hello world!',
        array: ['one', 'two', 'three'],
      }),
    );
    await space.db.flush();

    const promise = space.internal.db.coreDatabase.rootChanged.waitForCount(1);
    await space.internal.createEpoch({ migration: CreateEpochRequest.Migration.PRUNE_AUTOMERGE_ROOT_HISTORY });
    await promise;
    await space.db.flush();

    const expando = space.db.add(Obj.make(TestSchema.Expando, { value: [1, 2, 3] }));
    const todo = space.db.add(
      Obj.make(Todo, {
        name: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      }),
    );
    Obj.change(expando, (e) => {
      e.value.push(Ref.make(todo));
    });
    await space.db.flush({ indexes: true });
  }

  {
    // Create second space and data.
    const space = await client.spaces.create({ name: 'second-space' });

    // Create dynamic schema.
    const TestType = Schema.Struct({
      testField: Schema.String,
    }).pipe(
      Type.object({
        typename: 'example.org/type/Test',
        version: '0.1.0',
      }),
    );
    const [dynamicSchema] = await space.db.schemaRegistry.register([TestType]);

    const object2 = space.db.add(Obj.make(dynamicSchema, { testField: 'Test' }));

    dynamicSchema.addFields({ name: Schema.String, todo: Type.Ref(Todo) });
    Obj.change(object2, (object) => {
      object.name = 'Test';
      object.todo = Ref.make(Obj.make(Todo, { name: 'Test todo' }));
    });
    await space.db.flush({ indexes: true });
  }
  log.info('created spaces');
};
