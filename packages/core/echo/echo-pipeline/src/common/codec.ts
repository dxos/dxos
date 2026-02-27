//
// Copyright 2022 DXOS.org
//

import { type Codec } from '@dxos/codec-protobuf';
import { createCodecEncoding } from '@dxos/hypercore';
import { schema } from '@dxos/protocols/proto';
import type { FeedMessage } from '@dxos/protocols/buf/dxos/echo/feed_pb';

/**
 * Codec for feed messages.
 */
export const codec: Codec<FeedMessage> = schema.getCodecForType('dxos.echo.feed.FeedMessage') as any;

/**
 * Value encoding used by feed store.
 */
export const valueEncoding = createCodecEncoding(codec);
