//
// Copyright 2020 DXOS.org
//

import { Codec } from '@dxos/codec-protobuf';

import { Schema as HaloSchema } from '@dxos/credentials';
import { Schema } from '@dxos/experimental-echo-protocol';
import { Schema as ObjectSchema } from '@dxos/experimental-object-model';

export const codec = new Codec('dxos.FeedMessage')
  .addJson(Schema)
  .addJson(ObjectSchema)
  .addJson(HaloSchema)
  .build();
