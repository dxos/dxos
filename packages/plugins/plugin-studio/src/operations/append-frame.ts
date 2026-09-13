//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';

import { Frame, MediaArtifact, Storyboard, StudioOperation } from '#types';

/**
 * Appends one frame: makes the media artifact (its `generator` set to the provider), parents it to
 * a new frame, appends the frame, and — when asked — generates it in the same call. Shared by
 * `append-frame` and `create-storyboard`. Generation is a separate operation so a caller can batch
 * appends first; folding it in serves callers that cannot thread the returned ref (a scripted model).
 */
export const appendFrame = Effect.fn(function* (
  storyboard: Storyboard.Storyboard,
  { name, kind, prompt, notes, provider, config: extra }: StudioOperation.FrameInput,
  generate: boolean | undefined,
) {
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
  const config = { ...(extra ?? {}), prompt };
  const generated = generate
    ? (yield* Operation.invoke(StudioOperation.Generate, { artifact: Ref.make(artifact), provider, config })).count
    : undefined;
  return { frame: Ref.make(frame), artifact: Ref.make(artifact), config, generated };
});

const handler: Operation.WithHandler<typeof StudioOperation.AppendFrame> = StudioOperation.AppendFrame.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ storyboard: storyboardRef, generate, ...frame }) {
      const storyboard = yield* Database.load(storyboardRef);
      return yield* appendFrame(storyboard, frame, generate);
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
