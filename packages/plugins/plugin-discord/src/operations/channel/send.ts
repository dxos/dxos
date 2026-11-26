//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import * as ChannelBackend from '@dxos/plugin-thread/ChannelBackend';

import { DiscordChannel } from '#types';

import { makeDiscordChannelBackend } from '../../capabilities/channel-backend.ts';

const handler: Operation.WithHandler<typeof DiscordChannel.BackendOperation.Send> =
  DiscordChannel.BackendOperation.Send.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ channel: channelRef, thread, text }) {
        const channel = yield* Database.load(channelRef);
        return yield* ChannelBackend.sendThrough(makeDiscordChannelBackend(), channel, thread, text);
      }),
    ),
  );

export default handler;
