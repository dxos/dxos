//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';

import * as Image from './Image';

/**
 * A gallery: an ordered collection of {@link Image}s that it OWNS (each image is parented to the
 * gallery, so it cascade-deletes and deep-clones with it). Unlike {@link ImageArtifact}, a gallery
 * has no prompt — images are added by upload.
 */
export class Gallery extends Type.makeObject<Gallery>(DXN.make('org.dxos.type.gallery', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    images: Schema.Array(Ref.Ref(Image.Image)).pipe(FormInputAnnotation.set(false), Schema.optional),
  }).pipe(LabelAnnotation.set(['name']), Annotation.IconAnnotation.set({ icon: 'ph--images--regular', hue: 'purple' })),
) {}

export const make = ({ name }: { name?: string } = {}): Gallery => Obj.make(Gallery, { name, images: [] });
