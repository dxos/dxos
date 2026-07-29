//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { BoardLayout, defaultLayout } from '@dxos/react-ui-board';

import * as Artifact from './Artifact';

/**
 * A spatial "lightbox" view over a set of {@link Artifact}s laid out on a board grid. Layout is a
 * *view* concern (reuses `react-ui-board`'s `BoardLayout`), distinct from a `Collection` (masonry) of
 * the same artifacts — the artifacts are referenced, not owned.
 */
export class Lightbox extends Type.makeObject<Lightbox>(DXN.make('org.dxos.type.lightbox', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    items: Schema.Array(Ref.Ref(Artifact.Artifact)).pipe(FormInputAnnotation.set(false)),
    layout: BoardLayout.pipe(FormInputAnnotation.set(false)),
  }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--squares-four--regular', hue: 'purple' }),
  ),
) {}

/** Creates an empty {@link Lightbox} with the default board layout. */
export const make = ({ name }: { name?: string } = {}): Lightbox =>
  Obj.make(Lightbox, { name, items: [], layout: defaultLayout });
