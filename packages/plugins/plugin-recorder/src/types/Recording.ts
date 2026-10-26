//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import * as Presentation from '@dxos/plugin-presenter/Presentation';
import * as MediaArtifact from '@dxos/plugin-studio/MediaArtifact';

/**
 * The voice-overs (and videos) recorded for a presentation. Each take is a `Variant` of one of its owned media
 * artifacts, by kind, with the take's timeline in the variant's `config`.
 */
export class Recording extends Type.makeObject<Recording>(DXN.make('org.dxos.type.recording', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    presentation: Ref.Ref(Presentation.Presentation).pipe(Annotation.FormInputAnnotation.set(false)),
    /** Audio-only takes. */
    audio: Schema.optional(
      Ref.Ref(MediaArtifact.MediaArtifact).pipe(Annotation.SetParent.set(), Annotation.FormInputAnnotation.set(false)),
    ),
    /** Takes with a screen or camera picture. */
    video: Schema.optional(
      Ref.Ref(MediaArtifact.MediaArtifact).pipe(Annotation.SetParent.set(), Annotation.FormInputAnnotation.set(false)),
    ),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--record--regular', hue: 'red' }),
  ),
) {}

/** A recording of `presentation`, parented to it so it goes when the presentation does. */
export const make = (presentation: Presentation.Presentation, name?: string): Recording =>
  Obj.make(Recording, { name, presentation: Ref.make(presentation), [Obj.Parent]: presentation });
