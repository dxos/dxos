//
// Copyright 2025 DXOS.org
//

import * as Inspector from 'node:inspector/promises';

import * as Command from '@effect/cli/Command';
import * as Console from 'effect/Console';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';
import { mountDevtoolsHooks } from '@dxos/client/devtools';

export const inspector = Command.make(
  'inspector',
  {},
  Effect.fnUntraced(function* () {
    mountDevtoolsHooks({ client: yield* ClientService });

    Inspector.open();
    const url = Inspector.url();
    yield* Console.log('PID:', process.pid);
    yield* Console.log('hint: In VSCode, use: `Attach to Node Process` and paste the PID above.');
    return yield* Effect.forever(Effect.sleep(Duration.minutes(1)));
  }),
);
