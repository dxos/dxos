//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';

const client = new Client();
await client.initialize();
const _identity = await client.halo.createIdentity({ displayName: 'Alice' } as any);
