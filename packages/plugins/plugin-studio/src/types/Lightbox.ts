//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { BoardLayout, defaultLayout } from '@dxos/react-ui-board/types';

import * as MediaArtifact from './MediaArtifact.ts';

/**
 * A spatial "lightbox" view over a set of {@link MediaArtifact}s laid out on a board grid. Layout is a
 * *view* concern (reuses `react-ui-board`'s `BoardLayout`), distinct from a `Collection` (masonry) of
 * the same artifacts — the artifacts are referenced, not owned.
 */
export class Lightbox extends Type.makeObject<Lightbox>(DXN.make('org.dxos.type.lightbox', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    items: Schema.Array(Ref.Ref(MediaArtifact.MediaArtifact)).pipe(Annotation.FormInputAnnotation.set(false)),
    layout: BoardLayout.pipe(Annotation.FormInputAnnotation.set(false)),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--squares-four--regular', hue: 'indigo' }),
  ),
) {}

/** Creates an empty {@link Lightbox} with the default board layout. */
export const make = ({ [Obj.Parent]: parent, name }: { [Obj.Parent]?: Obj.Unknown; name?: string } = {}): Lightbox =>
  Obj.make(Lightbox, { [Obj.Parent]: parent, name, items: [], layout: defaultLayout });
