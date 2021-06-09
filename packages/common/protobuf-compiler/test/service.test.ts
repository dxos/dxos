import { schema } from './gen'
import { TaskType } from './gen/dxos/test';
import { MyKey } from './my-key';

test('services', async () => {
  const service = schema.getService('dxos.test.TestService');

  const server = service.createServer({
    async CountTasks(tasks) {
      return {
        count: tasks.tasks?.length ?? 0,
      }
    }
  })

  const client = service.createClient(server)

  const response = await client.CountTasks({
    tasks: [{
      key: new MyKey(new Uint8Array([1, 2, 3])),
      type: TaskType.COMPLETED
    }]
  })

  expect(response.count).toEqual(1)
})
