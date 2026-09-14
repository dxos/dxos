//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';

import * as Frame from './Frame.ts';

/**
 * An ordered sequence of {@link Frame}s, each showing a media artifact — a vertical storyboard,
 * and the same shape a slide deck takes (a frame per slide). The frames are owned: `SetParent` on
 * the array persists them with one `Database.add` cascade and deletes them with the storyboard;
 * array order is the canonical order.
 */
export class Storyboard extends Type.makeObject<Storyboard>(DXN.make('org.dxos.type.storyboard', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    frames: Schema.Array(Ref.Ref(Frame.Frame)).pipe(Annotation.SetParent.set(true), FormInputAnnotation.set(false)),
  }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--film-strip--regular', hue: 'indigo' }),
  ),
) {}

/** Creates an empty {@link Storyboard}. */
export const make = ({ name }: { name?: string } = {}): Storyboard => Obj.make(Storyboard, { name, frames: [] });

/**
 * Appends a frame (parented to the storyboard) and returns it. Ref before parent edge: the ref is
 * what declares the edge.
 */
export const appendFrame = (storyboard: Storyboard, frame: Frame.Frame): Frame.Frame => {
  Obj.update(storyboard, (storyboard) => {
    storyboard.frames.push(Ref.make(frame));
  });
  Obj.setParent(frame, storyboard);
  return frame;
};

/** Removes a frame from the sequence; the caller deletes the object. */
export const removeFrame = (storyboard: Storyboard, frame: Frame.Frame): void => {
  Obj.update(storyboard, (storyboard) => {
    storyboard.frames = storyboard.frames.filter((ref) => ref.target?.id !== frame.id);
  });
};

/** Moves the frame at `fromIndex` to `toIndex`; out-of-range indexes leave the order unchanged. */
export const moveFrame = (storyboard: Storyboard, fromIndex: number, toIndex: number): void => {
  Obj.update(storyboard, (storyboard) => {
    const frames = [...storyboard.frames];
    if (fromIndex < 0 || fromIndex >= frames.length || toIndex < 0 || toIndex >= frames.length) {
      return;
    }
    const [moved] = frames.splice(fromIndex, 1);
    frames.splice(toIndex, 0, moved);
    storyboard.frames = frames;
  });
};
