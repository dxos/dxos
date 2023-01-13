//
// Copyright 2022 DXOS.org
//

import { Codec } from '@dxos/codec-protobuf';
import { createCodecEncoding } from '@dxos/hypercore';
import { schema } from '@dxos/protocols';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';

/**
 * Codec for feed messages.
 */
export const codec: Codec<FeedMessage> = schema.getCodecForType('dxos.echo.feed.FeedMessage');

/**
 * Value encoding used by feed store.
 */
export const valueEncoding = createCodecEncoding(codec);
