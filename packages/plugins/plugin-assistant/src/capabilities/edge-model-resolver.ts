//
// Copyright 2025 DXOS.org
//

import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Redacted from 'effect/Redacted';

import { AnthropicResolver } from '@dxos/ai/resolvers';
import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

export type EdgeModelResolverCapabilities = [Capability.Capability<typeof AppCapabilities.AiModelResolver>];

const getAnthropicLayer = () => {
  const localKey = typeof globalThis.localStorage !== 'undefined'
    ? globalThis.localStorage.getItem('ANTHROPIC_API_KEY')
    : null;

  if (localKey) {
    return AnthropicClient.layer({
      apiKey: Redacted.make(localKey),
      apiUrl: '/api/anthropic',
    });
  }

  return AnthropicClient.layer({
    apiUrl: 'https://ai-service.dxos.workers.dev/provider/anthropic',
  });
};

const edgeModelResolver = Capability.makeModule<[], EdgeModelResolverCapabilities>(() =>
  Effect.succeed([
    Capability.contributes(
      AppCapabilities.AiModelResolver,
      AnthropicResolver.make().pipe(
        Layer.provide(getAnthropicLayer()),
        Layer.provide(FetchHttpClient.layer),
      ),
    ),
  ]),
);

export default edgeModelResolver;
