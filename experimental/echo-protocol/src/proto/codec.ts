//
// Copyright 2020 DXOS.org
//

import { Codec } from '@dxos/codec-protobuf';

import Schema from './gen/dxos.json';

export const codec = new Codec('dxos.FeedMessage')
  .addJson(Schema)
  .build();
