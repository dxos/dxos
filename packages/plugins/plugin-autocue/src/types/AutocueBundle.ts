//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';
import { FormatAnnotation, TypeFormat } from '@dxos/echo/Format';

/** A link to an autocue bundle: a folder of recorded demos with an `autocue.json` manifest, as on dx.pub. */
export class AutocueBundle extends Type.makeObject<AutocueBundle>(DXN.make('org.dxos.type.autocueBundle', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String).annotate({ title: 'Name' }),
    url: Schema.String.pipe(
      Schema.annotate({
        title: 'URL',
        description: 'The bundle folder, its index.html, or its autocue.json (e.g. https://dx.pub/demo/<slug>/).',
      }),
      FormatAnnotation.set(TypeFormat.URL),
      Schema.optional,
    ),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--film-strip--regular', hue: 'amber' }),
    Annotation.UserType.set(),
  ),
) {}

/** Drives the create form; without it the navtree factory creates an empty bundle with no dialog. */
export const CreateSchema = Schema.Struct({
  name: Schema.optional(Schema.String.annotate({ title: 'Name' })),
  url: Schema.optional(
    Schema.String.pipe(
      Schema.annotate({ title: 'URL', description: 'The bundle folder, its index.html, or its autocue.json.' }),
      FormatAnnotation.set(TypeFormat.URL),
    ),
  ),
});

export type MakeProps = Partial<{ name: string; url: string }>;

export const make = ({ name, url }: MakeProps = {}): AutocueBundle => Obj.make(AutocueBundle, { name, url });
