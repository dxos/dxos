//
// Copyright 2020 DXOS.org
//

import { schema } from './gen';

export * from './gen';
export * from './gen/dxos';
export * from './gen/dxos/echo';
export * from './gen/dxos/echo/snapshot';
export * from './gen/dxos/echo/testing';

export * from './messages';

export const codec = schema.getCodecForType('dxos.FeedMessage');
