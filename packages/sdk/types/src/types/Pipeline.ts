//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type, View } from '@dxos/echo';
import { FormInputAnnotation, GeneratorAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { Format } from '@dxos/echo/Format';

export const Column = Schema.Struct({
  name: Schema.String,
  order: Schema.Array(Schema.String),
  view: Ref.Ref(View.View),
});

export type Column = Schema.Schema.Type<typeof Column>;

// TODO(wittjosiah): Rename this type to avoid the name collision with DXOS pipelines (`@dxos/pipeline`,
//   the source→stages→sink streaming abstraction). This `Pipeline` is a board of View-backed columns
//   that records progress through (sales/research/hiring "pipelines"); `Board` and `Kanban` are taken
//   by other plugins. Renaming the TS class (and `plugin-pipeline`) resolves the collision; changing
//   the DXN `org.dxos.type.pipeline` additionally needs a data migration.
//   Candidates: `Funnel`, `Workflow`, `Journey`, `Track`.
// TODO(wittjosiah): Factor this type out of `@dxos/types` into its owning `plugin-pipeline` — it's a
//   plugin-specific board type (View-backed columns), not a cross-cutting core type.
export class Pipeline extends Type.makeObject<Pipeline>(DXN.make('org.dxos.type.pipeline', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.pipe(GeneratorAnnotation.set('commerce.productName'), Schema.optional),
    description: Schema.String.pipe(Schema.optional),
    image: Format.URL.pipe(Schema.annotations({ title: 'Image' }), Schema.optional),
    columns: Schema.Array(Column).pipe(FormInputAnnotation.set(false)),
  }).pipe(
    Schema.annotations({ title: 'Pipeline' }),
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--path--regular', hue: 'purple' }),
  ),
) {}

export const make = (props: Partial<Obj.MakeProps<typeof Pipeline>> = {}): Pipeline =>
  Obj.make(Pipeline, {
    columns: [],
    ...props,
  });
