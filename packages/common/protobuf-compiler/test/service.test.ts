import { schema } from './gen'

test('services', () => {
  const service = schema.getService('dxos.test.TestService').instantiate({
    call(method: string, request: Uint8Array): Promise<Uint8Array> {

    }
  })

  const response = await service.TestRpc({
    tasks: undefined
  })
})