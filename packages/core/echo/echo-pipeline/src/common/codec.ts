//
// Copyright 2022 DXOS.org
//

import { type Codec } from '@dxos/codec-protobuf';
import { createCodecEncoding } from '@dxos/hypercore';
import type { FeedMessage } from '@dxos/protocols/buf/dxos/echo/feed_pb';
import { schema } from '@dxos/protocols/proto';

/**
 * Codec for feed messages.
 */
export const codec: Codec<FeedMessage> = schema.getCodecForType('dxos.echo.feed.FeedMessage');

/**
 * Value encoding used by feed store.
 */
export const valueEncoding = createCodecEncoding(codec);
