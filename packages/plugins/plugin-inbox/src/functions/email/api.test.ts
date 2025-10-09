//
// Copyright 2025 DXOS.org
//

import { FetchHttpClient } from '@effect/platform';
import { describe, it } from '@effect/vitest';
import { Array, Config, Effect, Layer, pipe } from 'effect';

import { CredentialsService } from '@dxos/functions';
import { invariant } from '@dxos/invariant';

import { getMessage, listLabels, listMessages, messageToObject } from './api';

const TestLayer = Layer.mergeAll(
  CredentialsService.layerConfig([
    {
      service: 'gmail.com',
      // TODO(burdon): Rename `credential`.
      apiKey: Config.redacted('ACCESS_TOKEN'),
    },
  ]),
  FetchHttpClient.layer,
);

/**
 * To get a temporary access token:
 * https://developers.google.com/oauthplayground/#step1&apisSelect=https%3A%2F%2Fmail.google.com%2F%2Chttps%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.readonly&url=https%3A%2F%2F&content_type=application%2Fjson&http_method=GET&useDefaultOauthCred=unchecked&oauthEndpointSelect=Google&oauthAuthEndpointValue=https%3A%2F%2Faccounts.google.com%2Fo%2Foauth2%2Fv2%2Fauth&oauthTokenEndpointValue=https%3A%2F%2Foauth2.googleapis.com%2Ftoken&includeCredentials=unchecked&accessTokenType=bearer&autoRefreshToken=unchecked&accessType=offline&prompt=consent&response_type=code&wrapLines=on
 * Click Authorize, then Exchange authorization code for tokens.
 *
 * export ACCESS_TOKEN="xxx"
 * pnpm vitest api.test.ts
 */
describe.runIf(process.env.ACCESS_TOKEN)('Gmail API', { timeout: 30_000 }, () => {
  it.effect(
    'get labels',
    Effect.fnUntraced(function* ({ expect }) {
      const userId = 'rich@braneframe.com';
      const labels = yield* listLabels(userId);
      expect(labels).to.exist;
      console.log(JSON.stringify(labels, null, 2));
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'get messages',
    Effect.fnUntraced(function* ({ expect }) {
      const userId = 'rich@braneframe.com';
      const { messages } = yield* listMessages(userId, 'label:investor', 50);
      invariant(messages);

      const objects = yield* pipe(
        messages.slice(1, 2),
        Array.map((message) => pipe(getMessage(userId, message.id), Effect.flatMap(messageToObject()))),
        Effect.all,
      );

      expect(objects).to.exist;
      console.log(JSON.stringify(objects, null, 2));
    }, Effect.provide(TestLayer)),
  );
});
