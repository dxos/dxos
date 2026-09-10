//
// Copyright 2022 DXOS.org
//

import { create } from '@bufbuild/protobuf';

import { Client } from '@dxos/client';
import { ProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

const client = new Client();
await client.initialize();
const _identity = await client.halo.createIdentity(
  create(ProfileDocumentSchema, { displayName: 'Alice' }),
);
