//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as UndoMapping from '@dxos/app-framework/UndoMapping';
import { unionPaths } from '@dxos/react-ui-canvas/headless';

import { CanvasOperation } from '#types';

// Canvas edits undo by patch (VIEWS.md §8): an entry holds the heads either side and the paths written, and the inverse
// patches them back, scoped to the canvas so a focused canvas undoes only its own edits; the canvas has undo keys and
// buttons of its own, so its edits raise no undo toast.
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(Capabilities.UndoMapping, [
      UndoMapping.make({
        operation: CanvasOperation.Apply,
        inverse: CanvasOperation.Patch,
        deriveContext: (input, output) =>
          output.paths.length > 0
            ? { canvas: input.canvas, from: output.after, to: output.before, paths: output.paths }
            : undefined,
        scope: (_input, output) => output.canvas,
        toast: false,
      }),
      // A canvas view applies its edits itself, at once, and records them as a patch whose forward is already done.
      UndoMapping.make({
        operation: CanvasOperation.Patch,
        inverse: CanvasOperation.Patch,
        deriveContext: (input) =>
          input.paths.length > 0
            ? { canvas: input.canvas, from: input.to, to: input.from, paths: input.paths }
            : undefined,
        scope: (_input, output) => output.canvas,
        mergeKey: (input) => input.mergeKey,
        context: (input) => input.context,
        toast: false,
        // A run of patches is one patch from the first one's start to the last one's end over every path they wrote.
        merge: (earlier, later) => ({
          input: {
            ...later.input,
            from: earlier.input.from,
            paths: unionPaths(earlier.input.paths, later.input.paths),
            context: earlier.input.context,
          },
          output: later.output,
        }),
      }),
    ]);
  }),
);
