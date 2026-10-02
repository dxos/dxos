//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { log } from '@dxos/log';

import { SearchDialog } from '#containers';

export default Capability.makeModule(() =>
  Effect.tryPromise(() => SearchDialog.preload()).pipe(
    // A failed fetch only costs the first open its chunk load; the dialog retries it then.
    Effect.catch((error) => Effect.sync(() => log.warn('failed to preload search dialog', { error }))),
    Effect.as([]),
  ),
);
