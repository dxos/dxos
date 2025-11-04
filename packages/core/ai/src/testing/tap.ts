//
// Copyright 2025 DXOS.org
//

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpBody from '@effect/platform/HttpBody';
import * as Effect from 'effect/Effect';

import { log } from '@dxos/log';

export const tapHttpErrors = HttpClient.tap(
  Effect.fn(function* (res) {
    if (res.status > 299) {
      console.error('=== Failed provider call ===');
      console.error(`HTTP ${res.request.method} ${res.request.url}`);
      console.error(res.request.headers);
      const requestBody = yield* bodyText(res.request.body);
      console.error(requestBody);
      console.error();
      console.error('HTTP', res.status);
      console.error(res.headers);
      console.error(yield* res.text);
    }
  }),
);

const bodyText: (body: HttpBody.HttpBody) => Effect.Effect<string> = Effect.fn('bodyText')(function* (body) {
  switch (body._tag) {
    case 'Empty':
      return '';
    case 'Uint8Array':
      const string = new TextDecoder().decode(body.body);
      if (body.contentType === 'application/json') {
        try {
          return JSON.stringify(JSON.parse(string), null, 2);
        } catch {}
      }
      return string;
    default:
      return '<body type not supported>';
  }
});
