//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';

import * as MediaArtifact from './MediaArtifact.ts';

/**
 * One frame of a {@link Storyboard}: a reference to the {@link MediaArtifact} it shows plus notes.
 * A real object rather than an inline struct so it has an id (accordion value, navtree node, a
 * future slide) and can be moved between storyboards. Owned by its storyboard (`SetParent` on
 * `Storyboard.frames`); the artifact is a reference — created from the frame it is parented to
 * the frame, but the same artifact may sit in a Lightbox too.
 */
export class Frame extends Type.makeObject<Frame>(DXN.make('org.dxos.type.frame', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    notes: Schema.optional(Schema.String.annotate({ title: 'Notes' })),
    artifact: Schema.optional(Ref.Ref(MediaArtifact.MediaArtifact).pipe(FormInputAnnotation.set(false))),
  }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--frame-corners--regular', hue: 'indigo' }),
    // Owned child of a Storyboard — hidden from the navtree type list and object picker.
    Annotation.HiddenAnnotation.set(true),
  ),
) {}

/** Creates a {@link Frame}, optionally showing an artifact. */
export const make = ({ name, artifact }: { name?: string; artifact?: MediaArtifact.MediaArtifact } = {}): Frame =>
  Obj.make(Frame, { name, artifact: artifact ? Ref.make(artifact) : undefined });
