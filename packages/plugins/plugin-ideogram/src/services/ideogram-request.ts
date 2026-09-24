//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Format } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/Annotation';

/** The `/generate` endpoint's `aspect_ratio` names; 16:9 is the storyboard's frame shape. */
export const IDEOGRAM_ASPECT_RATIOS = [
  'ASPECT_16_9',
  'ASPECT_9_16',
  'ASPECT_1_1',
  'ASPECT_4_3',
  'ASPECT_3_4',
  'ASPECT_3_2',
  'ASPECT_2_3',
  'ASPECT_16_10',
  'ASPECT_10_16',
  'ASPECT_3_1',
  'ASPECT_1_3',
] as const;
export const IDEOGRAM_DEFAULT_ASPECT_RATIO: (typeof IDEOGRAM_ASPECT_RATIOS)[number] = 'ASPECT_16_9';

/**
 * The Ideogram-specific request config (the `kind: 'image'` provider's `requestSchema`). Includes the
 * `prompt`; the count is supplied by the generate op. Studio renders these as a schema-driven form.
 */
export const IdeogramRequestConfig = Schema.Struct({
  model: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false)).annotate({ title: 'Model' })),
  prompt: Schema.NonEmptyString.pipe(
    Format.FormatAnnotation.set(Format.TypeFormat.Markdown),
    Schema.annotate({ title: 'Prompt' }),
  ),
  negativePrompt: Schema.optional(
    Schema.String.pipe(
      Format.FormatAnnotation.set(Format.TypeFormat.Markdown),
      Schema.annotate({ title: 'Negative prompt' }),
    ),
  ),
  aspectRatio: Schema.optional(Schema.Literals(IDEOGRAM_ASPECT_RATIOS).annotate({ title: 'Aspect ratio' })),
  styleType: Schema.optional(Schema.String.annotate({ title: 'Style' })),
  seed: Schema.optional(Schema.Number.annotate({ title: 'Seed' })),
});
export interface IdeogramRequestConfig extends Schema.Schema.Type<typeof IdeogramRequestConfig> {}

/** Decodes the kind-specific config (incl. prompt) from a generation request (excess keys ignored). */
export const decodeIdeogramConfig = Schema.decodeUnknownSync(IdeogramRequestConfig);
