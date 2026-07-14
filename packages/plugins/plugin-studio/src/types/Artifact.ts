//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';

import * as Variant from './Variant';

/**
 * A media-agnostic unit of creative work: a set of produced {@link Variant}s. `kind` is an open
 * discriminator (`'image' | 'video' | …`) selecting rendering + provider — new media add behavior (a
 * renderer, a provider), never columns. The prompt + request knobs live per-variant in `Variant.config`
 * (the generator's `requestSchema`), composed via an in-memory draft variant in the article.
 */
export class Artifact extends Type.makeObject<Artifact>(DXN.make('org.dxos.type.artifact', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    /** Open discriminator: 'image' | 'video' | … (no enum). Selects renderer + provider. */
    kind: Schema.String,
    /** Chosen GenerationService id for this kind (passed to op:generate as `provider`). */
    generator: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
    /** Owned interchangeable alternatives of the primary output; each records its own generation. */
    variants: Schema.Array(Ref.Ref(Variant.Variant)).pipe(FormInputAnnotation.set(false), Schema.optional),
    /** The chosen/primary variant (used for thumbnails). */
    cover: Schema.optional(Ref.Ref(Variant.Variant).pipe(FormInputAnnotation.set(false))),
    /** Downstream products (transcript, summary, caption, upscale, …). */
    derived: Schema.Array(Ref.Ref(Obj.Unknown)).pipe(FormInputAnnotation.set(false), Schema.optional),
  }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--paint-brush--regular', hue: 'purple' }),
  ),
) {}

/** Creates an Artifact. `kind` defaults to `'image'`. */
export const make = ({ name, kind = 'image' }: { name?: string; kind?: string } = {}): Artifact =>
  Obj.make(Artifact, { name, kind, variants: [] });
