//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Format, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';

import * as Generation from './Generation';

/**
 * One produced output of an {@link Artifact} — an interchangeable alternative of the primary
 * output. Media-agnostic: `contentType` (mime) selects the `VariantRenderer` surface; `content`
 * holds the asset object (a `File` of bytes, a `Text`, …) once materialized, while `url` holds an
 * ephemeral provider URL until then. Generated variants carry `generation` provenance; uploaded or
 * external ones do not.
 */
export class Variant extends Type.makeObject<Variant>(DXN.make('org.dxos.type.variant', '0.1.0'))(
  Schema.Struct({
    /** Human label for the variant (defaults from the prompt). */
    name: Schema.optional(Schema.String),
    /** Mime type — selects the VariantRenderer surface (e.g. image/png, video/mp4). */
    contentType: Schema.optional(Schema.String),
    /** The asset object (File bytes, Text, …). Generic so any medium can be attached. */
    content: Schema.optional(Ref.Ref(Obj.Unknown).pipe(FormInputAnnotation.set(false))),
    /** Ephemeral provider URL until materialized into `content`. */
    url: Schema.optional(
      Schema.String.pipe(
        Format.FormatAnnotation.set(Format.TypeFormat.URL),
        Schema.annotations({ title: 'URL', description: 'Ephemeral provider URL.' }),
      ),
    ),
    /** The request config that produced this variant (validated against the provider's requestSchema). */
    config: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
    /** Generation provenance (absent ⇒ uploaded/external). */
    generation: Schema.optional(Generation.Generation),
    /**
     * In-flight generation job id for an asynchronous provider (set at enqueue, cleared once the
     * result is filled in). A variant carries its own job so a long poll resumes across remount.
     */
    jobId: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
    /** Extensibility escape hatch (media-specific extras). */
    meta: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--image--regular', hue: 'purple' }),
    // Owned child of an Artifact — hidden from the navtree and object picker (mirrors Instructions).
    Annotation.HiddenAnnotation.set(true),
  ),
) {}

/** Creates a {@link Variant} from the given props. */
export const make = (props: Obj.MakeProps<typeof Variant>): Variant => Obj.make(Variant, props);
