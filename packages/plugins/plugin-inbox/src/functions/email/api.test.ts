//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Test from '@effect/vitest';
import * as Array from 'effect/Array';
import * as Config from 'effect/Config';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';

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
Test.describe.runIf(process.env.ACCESS_TOKEN)('Gmail API', { timeout: 30_000 }, () => {
  Test.it.effect(
    'get labels',
    Effect.fnUntraced(function* ({ expect }) {
      const userId = 'rich@braneframe.com';
      const labels = yield* listLabels(userId);
      console.log(JSON.stringify(labels, null, 2));
      expect(labels).to.exist;
    }, Effect.provide(TestLayer)),
  );

  Test.it.effect(
    'get messages',
    Effect.fnUntraced(function* ({ expect }) {
      const userId = 'rich@braneframe.com';
      // const { messages } = yield* listMessages(userId, 'label:investor', 50);
      const { messages } = yield* listMessages(userId, 'maline', 50);
      invariant(messages);

      const objects = yield* Function.pipe(
        messages.slice(1, 2),
        Array.map((message) => Function.pipe(getMessage(userId, message.id), Effect.flatMap(messageToObject()))),
        Effect.all,
      );

      expect(objects).to.exist;
      console.log(JSON.stringify(objects, null, 2));
      console.log((objects?.[0]?.blocks?.[0] as any)?.text);
    }, Effect.provide(TestLayer)),
  );
});
