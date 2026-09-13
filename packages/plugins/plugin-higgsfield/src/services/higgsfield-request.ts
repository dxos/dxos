//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Format } from '@dxos/echo';

/**
 * The Higgsfield request config shared by the image and video services (each `requestSchema`):
 * the model endpoint path plus the `prompt`. Model availability is per account, so the path is a
 * free-form field rather than an enum. Studio renders these as a schema-driven form.
 */
export const HiggsfieldRequestConfig = Schema.Struct({
  model: Schema.NonEmptyString.annotate({
    title: 'Model',
    description: 'Higgsfield model path, e.g. higgsfield-ai/soul/v2/standard.',
  }),
  prompt: Schema.NonEmptyString.pipe(
    Format.FormatAnnotation.set(Format.TypeFormat.Text),
    Schema.annotate({ title: 'Prompt' }),
  ),
});
export interface HiggsfieldRequestConfig extends Schema.Schema.Type<typeof HiggsfieldRequestConfig> {}

/** Decodes the kind-specific config from a generation request (excess keys like count ignored). */
export const decodeHiggsfieldConfig = Schema.decodeUnknownSync(HiggsfieldRequestConfig);
