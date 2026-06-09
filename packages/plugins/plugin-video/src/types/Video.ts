//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormatAnnotation, FormInputAnnotation, LabelAnnotation, TypeFormat } from '@dxos/echo/internal';
import { Text } from '@dxos/schema';

/**
 * A video resource with an optional linked transcript.
 */
export const Video = Schema.Struct({
  name: Schema.optional(Schema.String).annotations({ title: 'Name' }),
  // Plain string with a URL format hint. `Format.URL`'s regex rejects query strings (e.g.
  // `?v=...`), which video URLs always carry, so the branded format cannot be used here.
  url: Schema.String.pipe(
    Schema.annotations({ title: 'URL', description: 'The source URL of the video.' }),
    FormatAnnotation.set(TypeFormat.URL),
    Schema.optional,
  ),
  transcript: Ref.Ref(Text.Text).pipe(
    Schema.annotations({ description: 'Generated transcript text object.' }),
    FormInputAnnotation.set(false),
    Schema.optional,
  ),
}).pipe(
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({ icon: 'ph--video-camera--regular', hue: 'red' }),
  Type.makeObject(DXN.make('org.dxos.type.video', '0.1.0')),
);

export type Video = Type.InstanceType<typeof Video>;

export type MakeProps = Partial<{ name: string; url: string }>;

export const make = ({ name, url }: MakeProps = {}): Video => Obj.make(Video, { name, url });
