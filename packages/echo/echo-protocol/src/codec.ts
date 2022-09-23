//
// Copyright 2020 DXOS.org
//

import { WithTypeUrl } from '@dxos/codec-protobuf';
import { schema } from '@dxos/protocols';

// TODO(burdon): Remove.
export const codec: WithTypeUrl<any> = schema.getCodecForType('dxos.echo.feed.FeedMessage');
