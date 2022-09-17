//
// Copyright 2020 DXOS.org
//

import { schema } from './gen';

export * from './gen';
export * from './gen/dxos/echo/feed';
export * from './gen/dxos/echo/invitation';
export * from './gen/dxos/echo/metadata';
export * from './gen/dxos/echo/service';
export * from './gen/dxos/echo/snapshot';

export * from './gen/dxos/testing/echo';

export * from './messages';

export const codec = schema.getCodecForType('dxos.echo.feed.FeedMessage');
