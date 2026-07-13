//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/**
 * The Ideogram-specific request config (the `kind: 'image'` provider's `requestSchema`). Excludes
 * the prompt (authored in the artifact's Instructions) and the count (supplied by the generate op);
 * studio renders these knobs as a schema-driven form.
 */
export const IdeogramRequestConfig = Schema.Struct({
  model: Schema.optional(Schema.String.annotations({ title: 'Model' })),
  aspectRatio: Schema.optional(Schema.String.annotations({ title: 'Aspect ratio' })),
  negativePrompt: Schema.optional(Schema.String.annotations({ title: 'Negative prompt' })),
  styleType: Schema.optional(Schema.String.annotations({ title: 'Style' })),
  seed: Schema.optional(Schema.Number.annotations({ title: 'Seed' })),
});
export interface IdeogramRequestConfig extends Schema.Schema.Type<typeof IdeogramRequestConfig> {}

/** Decodes the kind-specific knobs from a generation request (excess keys like prompt/count ignored). */
export const decodeIdeogramConfig = Schema.decodeUnknownSync(IdeogramRequestConfig);
