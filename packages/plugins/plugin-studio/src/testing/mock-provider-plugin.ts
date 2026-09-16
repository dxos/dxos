//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { DXN, Format, Ref } from '@dxos/echo';

import { GenerationService, MediaArtifact, StudioCapabilities } from '#types';

export const MOCK_PROVIDER_ID = 'mock';

// The prompt is required and multi-line, as the real providers declare it, so the story exercises
// the same Generate gating and the same textarea.
const MockRequestSchema = Schema.Struct({
  prompt: Schema.NonEmptyString.pipe(Format.FormatAnnotation.set(Format.TypeFormat.Markdown)).annotate({
    title: 'Prompt',
  }),
  style: Schema.optional(Schema.String.annotate({ title: 'Style' })),
  aspectRatio: Schema.optional(Schema.Literals(['16x9', '1x1']).annotate({ title: 'Aspect ratio' })),
  // The two field shapes the studio form dresses up: an uploadable URL and a reference artifact.
  imageUrl: Schema.optional(
    Schema.String.pipe(
      Format.FormatAnnotation.set(Format.TypeFormat.URL),
      GenerationService.FileUrlAnnotation.set({ accept: 'image/*' }),
      Schema.annotate({ title: 'Reference URL' }),
    ),
  ),
  imageArtifact: Schema.optional(Ref.Ref(MediaArtifact.MediaArtifact).annotate({ title: 'Reference image' })),
});

/** Non-reversible 32-bit FNV-1a fingerprint of the prompt: the same words give the same picture. */
const hashPrompt = (value: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16);
};

/** A picsum.photos image seeded by the prompt (and the variant index, so a batch differs), 16:9 unless square. */
export const mockImageUrl = (prompt: string, index = 0, aspectRatio: '16x9' | '1x1' = '16x9'): string =>
  `https://picsum.photos/seed/${hashPrompt(`${prompt}#${index}`)}/${aspectRatio === '1x1' ? '512/512' : '768/432'}`;

/**
 * A keyless `kind: 'image'` provider for stories: `generate` answers with picsum images seeded by a
 * hash of the prompt, so a frame's picture follows its words — regenerating the same prompt gives
 * the same image, a different prompt a different one — without a network credential.
 */
export const mockGenerationService: GenerationService.GenerationService = {
  kind: 'image',
  id: MOCK_PROVIDER_ID,
  label: 'Mock',
  contentType: 'image/png',
  requestSchema: MockRequestSchema,
  defaultRequest: { aspectRatio: '16x9' },
  generate: async (request) => {
    const prompt = typeof request.prompt === 'string' ? request.prompt : '';
    const aspectRatio = request.aspectRatio === '1x1' ? '1x1' : '16x9';
    const count = request.count ?? 1;
    return {
      variants: Array.from({ length: count }, (_, index) => ({
        contentType: 'image/png',
        url: mockImageUrl(prompt, index, aspectRatio),
        generation: { provider: MOCK_PROVIDER_ID, prompt, seed: index },
      })),
    };
  },
};

/** Registers {@link mockGenerationService} so a story's artifacts show the request form and can Generate. */
export const MockProviderPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.studio.story.mockProvider'), name: 'Mock Provider' }),
).pipe(
  Plugin.addModule({
    id: 'story.studio.mock-provider/module',
    provides: [StudioCapabilities.GenerationService],
    activate: () =>
      Effect.succeed([Capability.contribute(StudioCapabilities.GenerationService, mockGenerationService)]),
  }),
  Plugin.make,
);
