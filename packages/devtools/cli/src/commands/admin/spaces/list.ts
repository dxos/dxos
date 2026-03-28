//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { CommandConfig } from '@dxos/cli-util';
import { type ListSpacesResponse, type SpaceActivityEntry } from '@dxos/protocols';

import { adminRequest, formatAdminError } from '../util';

const formatSpaceRow = (space: SpaceActivityEntry): string => {
  const status = space.metadata?.status ?? 'unknown';
  const activity = space.lastActivity ? new Date(space.lastActivity).toLocaleString() : 'n/a';
  return `  ${space.spaceId}  ${status.padEnd(10)} ${String(space.totalEvents).padStart(8)} events  ${activity}`;
};

export const list = Command.make(
  'list',
  {
    limit: Options.integer('limit').pipe(
      Options.withDescription('Max results per page (capped at 200).'),
      Options.withDefault(50),
    ),
    cursor: Options.text('cursor').pipe(Options.withDescription('Pagination cursor.'), Options.optional),
    order: Options.choice('order', ['asc', 'desc']).pipe(
      Options.withDescription('Sort order by last activity.'),
      Options.withDefault('desc' as const),
    ),
  },
  Effect.fn(function* ({ limit, cursor, order }) {
    const query: Record<string, string> = { limit: String(limit), order };
    if (cursor._tag === 'Some') {
      query.cursor = cursor.value;
    }

    const data = yield* adminRequest('GET', '/admin/spaces', { query }).pipe(
      Effect.catchAll((error) => Effect.fail(new Error(formatAdminError(error)))),
    );

    if (yield* CommandConfig.isJson) {
      yield* Console.log(JSON.stringify(data, null, 2));
    } else {
      const result = data as ListSpacesResponse;
      if (result.spaces.length === 0) {
        yield* Console.log('No spaces found.');
      } else {
        yield* Console.log(`Spaces (${result.spaces.length}):\n`);
        for (const space of result.spaces) {
          yield* Console.log(formatSpaceRow(space));
        }
        if (result.cursor) {
          yield* Console.log(`\nNext page: --cursor ${result.cursor}`);
        }
      }
    }
  }),
).pipe(Command.withDescription('List spaces by recent activity.'));
