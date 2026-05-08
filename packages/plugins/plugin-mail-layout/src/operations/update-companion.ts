//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';

// The mail layout doesn't have a companion plank — selection alone drives the
// detail pane. Provide a no-op handler so `useShowItem`'s default-mode dispatch
// resolves cleanly instead of throwing on an unhandled operation.
const handler: Operation.WithHandler<typeof LayoutOperation.UpdateCompanion> = LayoutOperation.UpdateCompanion.pipe(
  Operation.withHandler(Effect.fnUntraced(function* () {})),
);

export default handler;
