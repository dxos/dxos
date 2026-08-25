//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Outline } from '@dxos/types';

import { OutlineOperation } from '#types';

/**
 * Returns an unsaved `Outline` for the caller to place — the create flow parents it — so this is a
 * factory rather than a database write.
 */
const handler: Operation.WithHandler<typeof OutlineOperation.CreateOutline> = OutlineOperation.CreateOutline.pipe(
  Operation.withHandler(({ name }) =>
    Effect.succeed({
      object: Outline.make({ name }),
    }),
  ),
);

export default handler;
