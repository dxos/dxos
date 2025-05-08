//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';

const client = new Client();
await client.initialize();

// Get a list of all spaces.
const _spaces = client.spaces.get();
