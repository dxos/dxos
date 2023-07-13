import { FunctionContext } from '@dxos/functions'

export default function chess(event: any, context: FunctionContext) {
  const identity = context.client.halo.identity.get()
  return context.status(200).succeed({ event, greeting: `Hello, ${identity?.profile?.displayName}` });
}