//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import type * as Option from 'effect/Option';

import { ClientService } from '@dxos/client';
import { type Key } from '@dxos/echo';

import { CommandConfig } from '../../../services';
import { formatSpace, getSpace, print, printSpace, spaceIdWithDefault } from '../../../util';
import { Common } from '../../options';

export const handler = Effect.fn(function* ({ spaceId }: { spaceId: Option.Option<string> }) {
  const { json } = yield* CommandConfig;
  const client = yield* ClientService;

  const resolvedSpaceId = yield* spaceIdWithDefault(spaceId as Option.Option<Key.SpaceId>);
  const space = yield* getSpace(resolvedSpaceId);

  const formatted = yield* formatSpace(space);

  if (json) {
    yield* Console.log(JSON.stringify(formatted, null, 2));
  } else {
    yield* Console.log(print(printSpace(formatted)));
  }
});

export const info = Command.make(
  'info',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
  },
  handler,
).pipe(Command.withDescription('Show space info.'));

