//
// Copyright 2020 DXOS.org
//

import { WithTypeUrl } from '@dxos/codec-protobuf';
import { schema } from '@dxos/protocols';

// TODO(burdon): Remove, rename to feedCodec and move to echo.
export const codec: WithTypeUrl<any> = schema.getCodecForType('dxos.echo.feed.FeedMessage');
