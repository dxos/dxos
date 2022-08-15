import { Keyring, KeyType } from '@dxos/credentials'
import { Credential } from './proto';

describe('verifier', () => {
  describe('no chain', () => {
    test('pass', async () => {
      const keyring = new Keyring();
      const key = await keyring.createKeyRecord({ type: KeyType.IDENTITY })

      const credential: Credential = {
        
      }
    })
  })
})


type X = number
const func = <T> (x: T): [T, T] => [x, x]



const instantiate = <F extends (...args: any) => any, A>() => func(null as any as A);

type Res = ReturnType<typeof instantiate<typeof func, X>>;