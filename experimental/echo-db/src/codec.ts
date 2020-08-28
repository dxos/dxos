//
// Copyright 2020 DXOS.org
//

import { Codec } from '@dxos/codec-protobuf';

import { Schema as HaloSchema } from '@dxos/credentials';
import { Schema as EchoSchema } from '@dxos/experimental-echo-protocol';
import { Schema as ObjectSchema } from '@dxos/experimental-object-model';

export const codec = new Codec('dxos.FeedMessage')
  .addJson(EchoSchema)
  .addJson(ObjectSchema)
  .addJson(HaloSchema)
  .build();
