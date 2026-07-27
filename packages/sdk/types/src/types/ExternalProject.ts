//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';
import { GeneratorAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { Format } from '@dxos/echo/Format';

/** Lightweight, non-AI project mirrored from a remote service (e.g. GitHub repos, Linear projects). */
export class ExternalProject extends Type.makeObject<ExternalProject>(
  DXN.make('org.dxos.type.externalProject', '0.1.0'),
)(
  Schema.Struct({
    name: Schema.String.pipe(GeneratorAnnotation.set('commerce.productName'), Schema.optional),
    description: Schema.String.pipe(Schema.optional),
    image: Format.URL.pipe(Schema.annotations({ title: 'Image' }), Schema.optional),
  }).pipe(
    Schema.annotations({ title: 'External Project' }),
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--check-square-offset--regular', hue: 'indigo' }),
  ),
) {}

/** Factory wrapper around `Obj.make` for {@link ExternalProject}. */
export const make = (props: Partial<Obj.MakeProps<typeof ExternalProject>> = {}): ExternalProject =>
  Obj.make(ExternalProject, { ...props });
