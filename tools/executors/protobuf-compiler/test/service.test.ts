//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { Stream } from '@dxos/codec-protobuf';

import { MyKey } from './my-key.js';
import { TaskType } from './proto/gen/example/testing/types.js';
import { schema } from './proto/index.js';

test('services', async () => {
  const service = schema.getService('example.testing.service.TestService');
  const server = service.createServer({
    countTasks: async (tasks) => ({ count: tasks.tasks?.length ?? 0 }),
    subscribeTasks: () => new Stream(() => {})
  });

  const client = service.createClient(server);
  const response = await client.countTasks({
    tasks: [{
      id: 'task-1',
      key: new MyKey(new Uint8Array([1, 2, 3])),
      type: TaskType.COMPLETED
    }]
  });

  expect(response.count).toEqual(1);
});
