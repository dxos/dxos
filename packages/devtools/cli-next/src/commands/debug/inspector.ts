//
// Copyright 2025 DXOS.org
//

import * as Inspector from 'node:inspector/promises';

import { Command } from '@effect/cli';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';

import { mountDevtoolsHooks } from '@dxos/client/devtools';

import { ClientService } from '../../services';

export const inspector = Command.make(
  'inspector',
  {},
  Effect.fnUntraced(function* () {
    mountDevtoolsHooks({ client: yield* ClientService });

    Inspector.open();
    const url = Inspector.url();
    console.log('PID:', process.pid);
    console.log('hint: In VSCode, use: `Attach to Node Process` and paste the PID above.');
    return yield* Effect.forever(Effect.sleep(Duration.minutes(1)));
  }),
);
