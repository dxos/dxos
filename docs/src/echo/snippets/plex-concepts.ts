//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/echo';

import { RecordVisit } from '../../app-framework-tutorial/src/types/BookmarkOperation.ts';

// #region wait
// `waitFor` suspends until some module contributes the capability, so this
// module can activate on Startup even though App Graph arrives later.
export const GraphReadyModule = Capability.inlineModule(
  'GraphReady',
  { provides: [], activatesOn: ActivationEvents.Startup },
  () =>
    Effect.gen(function* () {
      const graph = yield* Capability.waitFor(AppCapabilities.AppGraph);
      // An atom of every contribution, for reactive code.
      const schemas = yield* Capability.atom(AppCapabilities.Schema);
      console.log(typeof graph, schemas);
    }),
);
// #endregion

// #region invoke
// Any module, handler or action can run an operation by its definition.
export const visit = (bookmark: unknown) =>
  Operation.invoke(RecordVisit, { bookmark }).pipe(
    Effect.catchTag('NoHandlerError', () => Effect.succeed({ visits: 0 })),
  );
// #endregion

// #region undo
const Rename = Operation.make({
  meta: { key: DXN.make('com.example.operation.rename'), name: 'Rename' },
  input: Schema.Struct({ id: Schema.String, name: Schema.String }),
  output: Schema.Struct({ previous: Schema.String }),
});

// The inverse is the same operation with the previous name.
export const RenameUndoModule = Capability.inlineModule(
  'RenameUndo',
  {
    provides: [Capabilities.UndoMapping],
    activatesOn: ActivationEvents.Startup,
  },
  () =>
    Effect.succeed(
      Capability.contribute(Capabilities.UndoMapping, [
        {
          operation: Rename,
          inverse: Rename,
          deriveContext: (input, output) => ({
            id: input.id,
            name: output.previous,
          }),
          message: 'Renamed',
        },
      ]),
    ),
);
// #endregion
