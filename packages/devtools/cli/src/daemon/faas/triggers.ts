import { PublicKey } from '@dxos/keys';
import type { Trigger } from './connector';

export const TRIGGERS: Trigger[] = [
  {
    id: '1',
    spaceKey: '048207b439100844d12c2509e8fc78217d2c7458ea4e274136e06acce9cb0c8319f67bb0f4460c32e06c1c356a0355eeb159e7454f0862a612a598b347d2121451',
    function: {
      name: 'chess',
    },
    subscription: {
      props: {
        type: 'counter'
      }
    }
  }
];