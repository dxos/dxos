//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { DXN } from '@dxos/echo';
import type * as GenerationService from '@dxos/plugin-studio/GenerationService';
import * as StudioCapabilities from '@dxos/plugin-studio/StudioCapabilities';

export const FAKE_IMAGE_PROVIDER_ID = 'fake';

/** A 16:9 picture of mountains, inline so the story needs no network; the prompt picks nothing. */
export const fakeImageUrl = (_prompt: string): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e3a5f"/><stop offset="1" stop-color="#7aa7c7"/></linearGradient></defs><rect width="1600" height="900" fill="url(#g)"/><path d="M0 900 L420 380 L700 680 L1040 260 L1600 900 Z" fill="#e8eef3" opacity="0.85"/></svg>`,
  )}`;

/** A keyless `kind: 'image'` provider answering every prompt with {@link fakeImageUrl}. */
export const fakeImageProvider: GenerationService.GenerationService = {
  kind: 'image',
  id: FAKE_IMAGE_PROVIDER_ID,
  label: 'Fake',
  contentType: 'image/svg+xml',
  requestSchema: Schema.Struct({ prompt: Schema.String }),
  generate: async (request) => {
    const prompt = typeof request.prompt === 'string' ? request.prompt : '';
    return {
      variants: [
        {
          contentType: 'image/svg+xml',
          url: fakeImageUrl(prompt),
          generation: { provider: FAKE_IMAGE_PROVIDER_ID, prompt },
        },
      ],
    };
  },
};

/** Registers {@link fakeImageProvider} with plugin-studio, so its `Generate` resolves offline. */
export const FakeImageProviderPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.presenter.story.fakeImageProvider'), name: 'Fake image provider' }),
).pipe(
  Plugin.addModule({
    id: 'story.presenter.fake-image-provider/module',
    provides: [StudioCapabilities.GenerationService],
    activate: () => Effect.succeed([Capability.contribute(StudioCapabilities.GenerationService, fakeImageProvider)]),
  }),
  Plugin.make,
);
