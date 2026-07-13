//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';

import * as ImageArtifact from './ImageArtifact';

/**
 * A gallery: an ordered collection of {@link ImageArtifact}s that it OWNS (each artifact is parented
 * to the gallery, so it cascade-deletes and deep-clones with it). Each artifact is one "image" — a
 * prompt plus its generated/uploaded content; the gallery shows their thumbnails in a masonry.
 */
export class Gallery extends Type.makeObject<Gallery>(DXN.make('org.dxos.type.gallery', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    images: Schema.Array(Ref.Ref(ImageArtifact.ImageArtifact)).pipe(FormInputAnnotation.set(false), Schema.optional),
  }).pipe(LabelAnnotation.set(['name']), Annotation.IconAnnotation.set({ icon: 'ph--images--regular', hue: 'purple' })),
) {}

export const make = ({ name }: { name?: string } = {}): Gallery => Obj.make(Gallery, { name, images: [] });
