//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Format } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/Annotation';

/**
 * The Ideogram-specific request config (the `kind: 'image'` provider's `requestSchema`). Includes the
 * `prompt`; the count is supplied by the generate op. Studio renders these as a schema-driven form.
 */
export const IdeogramRequestConfig = Schema.Struct({
  prompt: Schema.optional(
    Schema.String.pipe(Format.FormatAnnotation.set(Format.TypeFormat.Text), Schema.annotations({ title: 'Prompt' })),
  ),
  model: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false)).annotations({ title: 'Model' })),
  aspectRatio: Schema.optional(Schema.String.annotations({ title: 'Aspect ratio' })),
  negativePrompt: Schema.optional(
    Schema.String.pipe(
      Format.FormatAnnotation.set(Format.TypeFormat.Text),
      Schema.annotations({ title: 'Negative prompt' }),
    ),
  ),
  styleType: Schema.optional(Schema.String.annotations({ title: 'Style' })),
  seed: Schema.optional(Schema.Number.annotations({ title: 'Seed' })),
});
export interface IdeogramRequestConfig extends Schema.Schema.Type<typeof IdeogramRequestConfig> {}

/** Decodes the kind-specific config (incl. prompt) from a generation request (excess keys ignored). */
export const decodeIdeogramConfig = Schema.decodeUnknownSync(IdeogramRequestConfig);
