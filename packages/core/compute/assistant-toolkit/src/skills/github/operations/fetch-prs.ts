//
// Copyright 2025 DXOS.org
//

import * as HttpClient from '@effect/platform/HttpClient';
import * as Effect from 'effect/Effect';

import { Credential, Operation } from '@dxos/compute';
import { withAuthorization } from '@dxos/compute-runtime';

import { FetchPrs } from './definitions';

export default FetchPrs.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ owner, repo }) {
      const credential = yield* Credential.CredentialsService.getCredential({ service: 'github.com' });
      const client = yield* HttpClient.HttpClient.pipe(Effect.map(withAuthorization(credential.apiKey!)));

      const response = yield* client.get(`https://api.github.com/repos/${owner}/${repo}/pulls`);
      const json: any = yield* response.json;
      return json;
    }),
  ),
);
