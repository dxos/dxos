//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { CredentialsService, TracingService } from '@dxos/functions';
import { Operation } from '@dxos/operation';

// TODO(dmaretskyi): Extract.
const TimeRangeSchema = Schema.String.pipe(Schema.pattern(/\d+(s|m|h|d)/)).annotations({
  description: 'Time range. 1d - 1 day, 2h - 2 hours, 30m - 30 minutes, 15s - 15 seconds.',
  examples: ['1d', '2h', '30m', '15s'],
});

export const TimeRange = Object.assign(TimeRangeSchema, {
  toSeconds(timeRange: string) {
    const match = timeRange.match(/(\d+)(s|m|h|d)/);
    if (!match) {
      throw new Error(`Invalid time range: ${timeRange}`);
    }
    const [_, amount, unit] = match;
    switch (unit) {
      case 's':
        return Number(amount);
      case 'm':
        return Number(amount) * 60;
      case 'h':
        return Number(amount) * 60 * 60;
      case 'd':
        return Number(amount) * 24 * 60 * 60;
      default:
        throw new Error(`Invalid time range unit: ${unit}`);
    }
  },
});

export const FetchMessages = Operation.make({
  meta: {
    key: 'org.dxos.function.fetch-discord-messages',
    name: 'Sync Discord messages',
  },
  input: Schema.Struct({
    serverId: Schema.String.annotations({
      description: 'The ID of the server to fetch messages from.',
    }),
    channelId: Schema.optional(Schema.String).annotations({
      description:
        'The ID of the channel to fetch messages from. Will crawl all channels from the server if not specified.',
    }),
    after: Schema.optional(Schema.Number).annotations({
      description:
        'Fetch messages that were sent after a given date. Unix timestamp in seconds. Exclusive with `last`.',
    }),
    last: TimeRange.annotations({
      description:
        'Time range to fetch most recent messages. Specifies the range in the past, from now. "1d" would fetch messages from the last 24 hours.',
    }),
    limit: Schema.optional(Schema.Number).annotations({
      description: 'The maximum number of messages to fetch.',
    }),
    pageSize: Schema.optional(Schema.Number).annotations({
      description: 'The number of messages to fetch per page.',
    }),
    ignoreUsernames: Schema.optional(Schema.Array(Schema.String)).annotations({
      description: 'Exclude messages from these usernames.',
    }),
  }),
  output: Schema.Any,
  services: [CredentialsService, TracingService],
});
