//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Format, Ref } from '@dxos/echo';
import * as GenerationService from '@dxos/plugin-studio/GenerationService';
import * as MediaArtifact from '@dxos/plugin-studio/MediaArtifact';

const model = Schema.NonEmptyString.annotate({
  title: 'Model',
  description: 'Higgsfield model path, e.g. higgsfield-ai/soul/v2/standard.',
});

const prompt = Schema.NonEmptyString.pipe(
  Format.FormatAnnotation.set(Format.TypeFormat.Markdown),
  Schema.annotate({ title: 'Prompt' }),
);

/**
 * The image service's request config: the model endpoint path plus the `prompt`. Model availability
 * is per account, so the path is a free-form field rather than an enum. Studio renders these as a
 * schema-driven form.
 */
/** The API's accepted ratios (its own error lists them); 16:9 is the storyboard's frame shape. */
export const HIGGSFIELD_ASPECT_RATIOS = ['16:9', '9:16', '4:3', '3:4', '1:1', '2:3', '3:2'] as const;
export const HIGGSFIELD_DEFAULT_ASPECT_RATIO: HiggsfieldAspectRatio = '16:9';

const aspectRatio = Schema.optional(Schema.Literals(HIGGSFIELD_ASPECT_RATIOS).annotate({ title: 'Aspect ratio' }));
export type HiggsfieldAspectRatio = (typeof HIGGSFIELD_ASPECT_RATIOS)[number];

export const HiggsfieldImageConfig = Schema.Struct({ model, prompt, aspectRatio });
export interface HiggsfieldImageConfig extends Schema.Schema.Type<typeof HiggsfieldImageConfig> {}

/**
 * The video service's request config. Higgsfield's video models animate a still (`image_url`),
 * so a frame is either given a still (`imageUrl`, or a reference image artifact's cover) or has
 * one generated from the prompt first (`imageModel`), then animated by `model`.
 */
export const HiggsfieldVideoConfig = Schema.Struct({
  model,
  prompt,
  // The animation follows its still's shape, so the ratio is the still's.
  aspectRatio,
  imageUrl: Schema.optional(
    Schema.String.pipe(
      Format.FormatAnnotation.set(Format.TypeFormat.URL),
      GenerationService.FileUrlAnnotation.set({ accept: 'image/*' }),
      Schema.annotate({ title: 'Still image', description: 'Image to animate; generated from the prompt when empty.' }),
    ),
  ),
  imageArtifact: Schema.optional(
    Ref.Ref(MediaArtifact.MediaArtifact).annotate({
      title: 'Reference image',
      description: 'A generated image whose cover is animated; used when no still URL is given.',
    }),
  ),
  imageModel: Schema.optional(
    Schema.String.annotate({ title: 'Image model', description: 'Image model used when no still is given.' }),
  ),
});
export interface HiggsfieldVideoConfig extends Schema.Schema.Type<typeof HiggsfieldVideoConfig> {}

/** Decodes the kind-specific config from a generation request (excess keys like count ignored). */
export const decodeImageConfig = Schema.decodeUnknownSync(HiggsfieldImageConfig);

const decodeVideoEncoded = Schema.decodeUnknownSync(HiggsfieldVideoConfig);
const decodeVideoTyped = Schema.decodeUnknownSync(Schema.toType(HiggsfieldVideoConfig));

/**
 * The video config's `imageArtifact` arrives as a live `Ref` from the form (the type side) or as its
 * `{ '/': dxn }` encoding from JSON (an agent's config), so both sides are accepted.
 */
export const decodeVideoConfig = (request: unknown): HiggsfieldVideoConfig => {
  try {
    return decodeVideoTyped(request);
  } catch {
    return decodeVideoEncoded(request);
  }
};
