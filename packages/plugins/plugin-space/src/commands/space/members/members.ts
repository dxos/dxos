//
// Copyright 2025 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import type * as Option from 'effect/Option';
import * as Command from 'effect/unstable/cli/Command';
import * as Options from 'effect/unstable/cli/Flag';

import { CommandConfig, Common, getSpace, printList, spaceIdWithDefault } from '@dxos/cli-util';
import { ClientService } from '@dxos/client';
import { type Key } from '@dxos/echo';

import { mapMembers, printMembers } from './util.ts';

export const handler = Effect.fn(function* ({ spaceId }: { spaceId: Option.Option<string> }) {
  const { json } = yield* CommandConfig;
  const client = yield* ClientService;

  const resolvedSpaceId = yield* spaceIdWithDefault(spaceId as Option.Option<Key.SpaceId>);
  const space = yield* getSpace(resolvedSpaceId);

  const members = space.members.get();

  if (json) {
    yield* Console.log(JSON.stringify(mapMembers(members), null, 2));
  } else {
    const formatted = printMembers(members);
    yield* Console.log(printList(formatted));
  }
});

export const members = Command.make(
  'members',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
  },
  handler,
).pipe(Command.withDescription('List space members.'));
