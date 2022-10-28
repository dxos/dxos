import { RpcPort } from "./rpc-port"
import * as rpc from '@dxos/rpc'


// This test will break at compile time if the interface changes.
it('RpcPort type is assignable to type from @dxos/rpc package', () => {
  {
    const port: RpcPort = {} as rpc.RpcPort
  }
  {
    const port: rpc.RpcPort = {} as RpcPort
  }
})