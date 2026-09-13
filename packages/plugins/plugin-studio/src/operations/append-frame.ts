//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';

import { Frame, MediaArtifact, Storyboard, StudioOperation } from '#types';

const handler: Operation.WithHandler<typeof StudioOperation.AppendFrame> = StudioOperation.AppendFrame.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ storyboard: storyboardRef, name, kind, prompt, notes, provider, config: extra }) {
      const storyboard = yield* Database.load(storyboardRef);
      const artifact = yield* Database.add(MediaArtifact.make({ name, kind }));
      if (provider) {
        Obj.update(artifact, (artifact) => {
          artifact.generator = provider;
        });
      }
      const frame = yield* Database.add(Frame.make({ name, artifact }));
      if (notes) {
        Obj.update(frame, (frame) => {
          frame.notes = notes;
        });
      }
      // Ref before parent edge on both hops: frame → artifact, storyboard → frame.
      Obj.setParent(artifact, frame);
      Storyboard.appendFrame(storyboard, frame);
      yield* Database.flush();
      return {
        frame: Ref.make(frame),
        artifact: Ref.make(artifact),
        config: { ...(extra ?? {}), prompt },
      };
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
