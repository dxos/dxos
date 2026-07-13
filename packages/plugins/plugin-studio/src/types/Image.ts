//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Format, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { File } from '@dxos/types';

/**
 * One image held by an {@link ImageArtifact} — either generated (remote `url` + provenance) or
 * uploaded (a `file` blob). Exactly one of `url` / `file` is populated.
 *
 * Provider image URLs are ephemeral — a generated `url` may expire; a later milestone can materialize
 * a `File.File` for permanence.
 */
export class Image extends Type.makeObject<Image>(DXN.make('org.dxos.type.image', '0.1.0'))(
  Schema.Struct({
    /** Remote image URL (generated images). */
    url: Schema.optional(
      Schema.String.pipe(
        Format.FormatAnnotation.set(Format.TypeFormat.URL),
        Schema.annotations({ title: 'URL', description: 'Remote image URL.' }),
      ),
    ),
    /** Uploaded image blob (via the file uploader). */
    file: Schema.optional(Ref.Ref(File.File).pipe(FormInputAnnotation.set(false))),
    prompt: Schema.optional(Schema.String),
    model: Schema.optional(Schema.String),
    resolution: Schema.optional(Schema.String),
    seed: Schema.optional(Schema.Number),
    styleType: Schema.optional(Schema.String),
    isImageSafe: Schema.optional(Schema.Boolean),
    metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  }).pipe(
    LabelAnnotation.set(['prompt']),
    Annotation.IconAnnotation.set({ icon: 'ph--image--regular', hue: 'purple' }),
    // Owned child of an ImageArtifact / Gallery — hidden from the navtree and object picker so it
    // does not appear as a standalone top-level type (mirrors Instructions).
    Annotation.HiddenAnnotation.set(true),
  ),
) {}

/** Creates an {@link Image} from the given props. */
export const make = (props: Obj.MakeProps<typeof Image>): Image => Obj.make(Image, props);
