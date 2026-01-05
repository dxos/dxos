//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import { describe, it } from '@effect/vitest';
import * as Config from 'effect/Config';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { CredentialsService } from '@dxos/functions';
import { Obj } from '@dxos/echo';
import { Message } from '@dxos/types';

import { GoogleMail } from '../../apis';

const TestLayer = Layer.mergeAll(
  CredentialsService.layerConfig([
    {
      service: 'google.com',
      // TODO(burdon): Rename `credential`.
      apiKey: Config.redacted('GOOGLE_ACCESS_TOKEN'),
    },
  ]),
  FetchHttpClient.layer,
);

/**
 * To get a temporary access token:
 * https://developers.google.com/oauthplayground/#step1&apisSelect=https%3A%2F%2Fmail.google.com%2F%2Chttps%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.readonly&url=https%3A%2F%2F&content_type=application%2Fjson&http_method=GET&useDefaultOauthCred=unchecked&oauthEndpointSelect=Google&oauthAuthEndpointValue=https%3A%2F%2Faccounts.google.com%2Fo%2Foauth2%2Fv2%2Fauth&oauthTokenEndpointValue=https%3A%2F%2Foauth2.googleapis.com%2Ftoken&includeCredentials=unchecked&accessTokenType=bearer&autoRefreshToken=unchecked&accessType=offline&prompt=consent&response_type=code&wrapLines=on
 * Click Authorize, then Exchange authorization code for tokens.
 *
 * export GOOGLE_ACCESS_TOKEN="xxx"
 * pnpm vitest send.test.ts
 */
describe.runIf(process.env.GOOGLE_ACCESS_TOKEN)('Gmail Send API', { timeout: 30_000 }, () => {
  it.effect(
    'send message',
    Effect.fnUntraced(function* ({ expect }) {
      const userId = 'me';

      // Construct a test message.
      const testMessage = Obj.make(Message.Message, {
        id: Obj.ID.random(),
        created: new Date().toISOString(),
        sender: {
          email: 'dmytro@braneframe.com',
          name: 'Dima',
        },
        blocks: [
          {
            _tag: 'text',
            text: `This is a test email sent via the Gmail API.\nDate ${new Date().toISOString()}`,
          },
        ],
        properties: {
          to: 'rich@braneframe.com', // Replace with actual test recipient
          subject: 'Test Email from Gmail Send Function',
        },
      });

      // Construct MIME message.
      const str = [
        `To: ${testMessage.properties?.to}`,
        `Subject: ${testMessage.properties?.subject ?? 'No Subject'}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        testMessage.blocks.find((b) => b._tag === 'text')?.text ?? '',
      ].join('\n');

      const raw = Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      const response = yield* GoogleMail.sendMessage(userId, { raw });

      console.log('Message sent:', JSON.stringify(response, null, 2));
      expect(response).to.exist;
      expect(response.id).to.be.a('string');
      expect(response.threadId).to.be.a('string');
    }, Effect.provide(TestLayer)),
  );
});
