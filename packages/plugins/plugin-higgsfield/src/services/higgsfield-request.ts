//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Format } from '@dxos/echo';

const model = Schema.NonEmptyString.annotate({
  title: 'Model',
  description: 'Higgsfield model path, e.g. higgsfield-ai/soul/v2/standard.',
});

const prompt = Schema.NonEmptyString.pipe(
  Format.FormatAnnotation.set(Format.TypeFormat.Text),
  Schema.annotate({ title: 'Prompt' }),
);

/**
 * The image service's request config: the model endpoint path plus the `prompt`. Model availability
 * is per account, so the path is a free-form field rather than an enum. Studio renders these as a
 * schema-driven form.
 */
export const HiggsfieldImageConfig = Schema.Struct({ model, prompt });
export interface HiggsfieldImageConfig extends Schema.Schema.Type<typeof HiggsfieldImageConfig> {}

/**
 * The video service's request config. Higgsfield's video models animate a still (`image_url`), so a
 * frame is either given a still (`imageUrl`) or has one generated from the prompt first
 * (`stillModel`), then animated by `model`.
 */
export const HiggsfieldVideoConfig = Schema.Struct({
  model,
  prompt,
  imageUrl: Schema.optional(
    Schema.String.pipe(
      Format.FormatAnnotation.set(Format.TypeFormat.URL),
      Schema.annotate({ title: 'Still', description: 'Image to animate; generated from the prompt when empty.' }),
    ),
  ),
  stillModel: Schema.optional(
    Schema.String.annotate({ title: 'Still model', description: 'Image model used when no still is given.' }),
  ),
});
export interface HiggsfieldVideoConfig extends Schema.Schema.Type<typeof HiggsfieldVideoConfig> {}

/** Decodes the kind-specific config from a generation request (excess keys like count ignored). */
export const decodeImageConfig = Schema.decodeUnknownSync(HiggsfieldImageConfig);
export const decodeVideoConfig = Schema.decodeUnknownSync(HiggsfieldVideoConfig);
