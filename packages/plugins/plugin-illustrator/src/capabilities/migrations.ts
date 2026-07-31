//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Migration } from '@dxos/echo';
import { ClientCapabilities } from '@dxos/plugin-client';

import { Drawing, LegacySketch } from '../types';

// `org.dxos.type.sketch` -> `org.dxos.type.drawing`. The shape is unchanged (name + canvas ref)
// and the canvas keeps its typename, so the transform is a field copy; the runtime swaps the
// object's type and retires the old one.
export const sketchToDrawing = Migration.define({
  from: LegacySketch.Sketch,
  to: Drawing.Drawing,
  transform: async ({ name, canvas }) => ({ name, canvas }),
});

const migrations = [sketchToDrawing];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(ClientCapabilities.Migration, migrations);
  }),
);
