//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Instructions } from '@dxos/compute';
import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';

import * as Variant from './Variant';

/**
 * A media-agnostic unit of creative work: a prompt paired with the outputs produced from it. `kind`
 * is an open discriminator (`'image' | 'video' | …`) selecting rendering + provider — new media add
 * behavior (a renderer, a provider), never columns. The prompt body lives in `instructions.text`
 * (a `Ref<Text>` owned by the {@link Instructions} object).
 */
export class Artifact extends Type.makeObject<Artifact>(DXN.make('org.dxos.type.artifact', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    /** Open discriminator: 'image' | 'video' | … (no enum). Selects renderer + provider. */
    kind: Schema.String,
    /** The prompt (rich text; @dxos/compute Instructions). */
    instructions: Ref.Ref(Instructions.Instructions).pipe(FormInputAnnotation.set(false)),
    /** Current generation request config (validated against the provider's requestSchema). */
    config: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
    /** Owned interchangeable alternatives of the primary output. */
    variants: Schema.Array(Ref.Ref(Variant.Variant)).pipe(FormInputAnnotation.set(false), Schema.optional),
    /** The chosen/primary variant (used for thumbnails). */
    cover: Schema.optional(Ref.Ref(Variant.Variant).pipe(FormInputAnnotation.set(false))),
    /** Downstream products (transcript, summary, caption, upscale, …). */
    derived: Schema.Array(Ref.Ref(Obj.Unknown)).pipe(FormInputAnnotation.set(false), Schema.optional),
    /** Extensibility escape hatch (media-specific extras). */
    meta: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--paint-brush--regular', hue: 'purple' }),
  ),
) {}

/**
 * Creates an Artifact with an owned {@link Instructions} object (holding the prompt), parented so it
 * cascade-deletes and deep-clones with the artifact. `kind` defaults to `'image'`.
 */
export const make = ({
  name,
  kind = 'image',
  prompt,
}: { name?: string; kind?: string; prompt?: string } = {}): Artifact => {
  const instructions = Instructions.make({ name, text: prompt ?? '' });
  const artifact = Obj.make(Artifact, {
    name,
    kind,
    instructions: Ref.make(instructions),
    variants: [],
  });
  Obj.setParent(instructions, artifact);
  return artifact;
};

/**
 * Creates a video {@link Artifact} (`kind: 'video'`) from a source `url`, attaching it as the cover
 * {@link Variant}. The nominal `video/mp4` contentType routes to the `VideoVariant` renderer, which
 * derives an embeddable player from the URL (YouTube/Vimeo/direct). Owned variant cascade-deletes
 * and deep-clones with the artifact.
 */
export const makeVideo = ({ name, url }: { name?: string; url?: string } = {}): Artifact => {
  const artifact = make({ name, kind: 'video' });
  if (url) {
    const variant = Variant.make({ contentType: 'video/mp4', url });
    Obj.setParent(variant, artifact);
    Obj.update(artifact, (artifact) => {
      artifact.variants = [Ref.make(variant)];
      artifact.cover = Ref.make(variant);
    });
  }
  return artifact;
};
