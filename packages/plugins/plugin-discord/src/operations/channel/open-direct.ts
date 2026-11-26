//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import * as ChannelBackend from '@dxos/plugin-thread/ChannelBackend';

import { DiscordBot, DiscordChannel } from '#types';

import { makeDiscordChannelBackend } from '../../capabilities/channel-backend.ts';

const handler: Operation.WithHandler<typeof DiscordChannel.BackendOperation.OpenDirect> =
  DiscordChannel.BackendOperation.OpenDirect.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ channel: channelRef, person: personRef }) {
        const channel = yield* Database.load(channelRef);
        const person = yield* Database.load(personRef);
        return yield* ChannelBackend.openDirectThrough(
          makeDiscordChannelBackend({ bot: yield* DiscordBot.DiscordBotService }),
          channel,
          person,
        );
      }),
    ),
  );

export default handler;
