import { Stream } from '@dxos/codec-protobuf';
import { schema } from './proto/gen'
import { TaskType } from './proto/gen/dxos/test';
import { MyKey } from './my-key';
import { it as test } from 'mocha'
import expect from 'expect'

test('services', async () => {
  const service = schema.getService('dxos.test.TestService');

  const server = service.createServer({
    async countTasks(tasks) {
      return {
        count: tasks.tasks?.length ?? 0,
      }
    },
    subscribeTasks() {
      return new Stream(() => {})
    }
  })

  const client = service.createClient(server)

  const response = await client.countTasks({
    tasks: [{
      id: 'foo',
      key: new MyKey(new Uint8Array([1, 2, 3])),
      type: TaskType.COMPLETED
    }]
  })

  expect(response.count).toEqual(1)
})
