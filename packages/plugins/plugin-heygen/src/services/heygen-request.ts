//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Format } from '@dxos/echo';

/**
 * The HeyGen-specific request config (the `kind: 'video'` provider's `requestSchema`): the `prompt`
 * (script) plus the avatar and voice ids. Studio renders these as a schema-driven form.
 */
export const HeyGenRequestConfig = Schema.Struct({
  prompt: Schema.NonEmptyString.pipe(
    Format.FormatAnnotation.set(Format.TypeFormat.Text),
    Schema.annotations({ title: 'Prompt' }),
  ),
  avatarId: Schema.NonEmptyString.annotations({ title: 'Avatar', description: 'HeyGen avatar id.' }),
  voiceId: Schema.NonEmptyString.annotations({ title: 'Voice', description: 'HeyGen voice id.' }),
});
export interface HeyGenRequestConfig extends Schema.Schema.Type<typeof HeyGenRequestConfig> {}

/** Decodes the kind-specific config from a generation request (excess keys like count ignored). */
export const decodeHeyGenConfig = Schema.decodeUnknownSync(HeyGenRequestConfig);
