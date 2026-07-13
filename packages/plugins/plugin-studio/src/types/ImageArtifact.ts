//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Instructions } from '@dxos/compute';
import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';

import * as Image from './Image';

/**
 * An image-creation artifact: an editable prompt paired with the images generated from it. The
 * prompt body lives in `instructions.text` (a `Ref<Text>` owned by the {@link Instructions} object).
 */
export class ImageArtifact extends Type.makeObject<ImageArtifact>(DXN.make('org.dxos.type.imageArtifact', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    instructions: Ref.Ref(Instructions.Instructions).pipe(FormInputAnnotation.set(false)),
    images: Schema.Array(Ref.Ref(Image.Image)).pipe(FormInputAnnotation.set(false), Schema.optional),
  }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--paint-brush--regular', hue: 'purple' }),
  ),
) {}

/**
 * Creates an ImageArtifact with an owned {@link Instructions} object (holding the prompt), parented
 * so it cascade-deletes and deep-clones with the artifact.
 */
export const make = ({ name, prompt }: { name?: string; prompt?: string } = {}): ImageArtifact => {
  const instructions = Instructions.make({ name, text: prompt ?? '' });
  const artifact = Obj.make(ImageArtifact, {
    name,
    instructions: Ref.make(instructions),
    images: [],
  });
  Obj.setParent(instructions, artifact);
  return artifact;
};
