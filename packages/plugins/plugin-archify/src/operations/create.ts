//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { Validate } from '#model';
import { Diagram, DiagramOperation } from '#types';

const handler: Operation.WithHandler<typeof DiagramOperation.Create> = DiagramOperation.Create.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, source }) {
      const object = Diagram.make({ name, source });
      // Report on what was actually stored, so a seeded diagram never looks clean by omission.
      const { ok, diagnostics } = Validate.validate(object.source);
      return { object, ok, diagnostics };
    }),
  ),
);

export default handler;
