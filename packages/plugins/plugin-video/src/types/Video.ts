//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { FormatAnnotation, TypeFormat } from '@dxos/echo/Format';
import { Text } from '@dxos/schema';

/**
 * A video resource with an optional linked transcript.
 */
export class Video extends Type.makeObject<Video>(DXN.make('org.dxos.type.video', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String).annotations({ title: 'Name' }),
    // Plain string with a URL format hint. `Format.URL`'s regex rejects query strings (e.g.
    // `?v=...`), which video URLs always carry, so the branded format cannot be used here.
    url: Schema.String.pipe(
      Schema.annotations({ title: 'URL', description: 'The source URL of the video.' }),
      FormatAnnotation.set(TypeFormat.URL),
      Schema.optional,
    ),
    description: Schema.String.pipe(
      Schema.annotations({ title: 'Description', description: 'The full published description of the video.' }),
      FormatAnnotation.set(TypeFormat.Text),
      Schema.optional,
    ),
    transcript: Ref.Ref(Text.Text).pipe(
      Schema.annotations({ description: 'Generated transcript.' }),
      FormInputAnnotation.set(false),
      Schema.optional,
    ),
    summary: Ref.Ref(Text.Text).pipe(
      Schema.annotations({ description: 'Generated summary.' }),
      FormInputAnnotation.set(false),
      Schema.optional,
    ),
  }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--video-camera--regular', hue: 'red' }),
  ),
) {}

export type MakeProps = Partial<{ name: string; url: string; description: string }>;

export const make = ({ name, url, description }: MakeProps = {}): Video => Obj.make(Video, { name, url, description });
