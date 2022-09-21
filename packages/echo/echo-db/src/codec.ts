import { Codec } from "@dxos/codec-protobuf";
import { schema } from "@dxos/protocols";
import { FeedMessage } from "@dxos/protocols/proto/dxos/echo/feed"; 

/**
 * Codec for messages written on feeds.
 */
export const codec: Codec<FeedMessage> = schema.getCodecForType('dxos.echo.feed.FeedMessage');