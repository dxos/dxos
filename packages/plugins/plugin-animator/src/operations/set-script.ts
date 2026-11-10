//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ScriptError } from '@dxos/animation';
import * as Operation from '@dxos/compute/Operation';
import { Obj } from '@dxos/echo';

import { compileShot, keyCount, stageContext } from '#model';
import { AnimatorOperation } from '#types';

import { loadShot } from './load.ts';

const handler: Operation.WithHandler<typeof AnimatorOperation.SetScript> = AnimatorOperation.SetScript.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ animation: ref, shot: shotId, script }) {
      const { animation, index, shot, object, stage } = yield* loadShot(ref, shotId);
      if (!stage) {
        return yield* Effect.fail(new AnimatorOperation.UnknownTargetError({ message: 'No stage renders the shot.' }));
      }
      // Compiled now only to report errors: playback recompiles, so the keys always follow the stage's objects.
      const compiled = yield* Effect.try({
        try: () => compileShot({ ...shot, script }, stageContext(stage, object)),
        catch: (error) =>
          error instanceof ScriptError
            ? new AnimatorOperation.ScriptError({ message: error.message, beat: error.beat })
            : new AnimatorOperation.ScriptError({ message: String(error), beat: -1 }),
      });
      Obj.update(animation, (animation) => {
        // By path: the script is decoded input whose effect references must be stored as references.
        Obj.setValue(animation, ['shots', index, 'script'], script);
      });
      return { animation: ref, keys: keyCount(compiled.timeline) };
    }),
  ),
);

export default handler;
