//
// Copyright 2025 DXOS.org
//

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as Effect from 'effect/Effect';

import { Database } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { Invoke } from './definitions';
import { ScriptDeploymentService } from './services';

export default Invoke.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ script, payload }) {
      const loaded = yield* Database.load(script);
      const deploymentService = yield* ScriptDeploymentService;
      const functionUrl = yield* deploymentService.getFunctionUrl(loaded);
      if (!functionUrl) {
        throw new Error('Script is not deployed. Deploy it first.');
      }

      const httpClient = yield* HttpClient.HttpClient;
      const request = yield* HttpClientRequest.post(functionUrl).pipe(
        HttpClientRequest.bodyJson(payload ?? {}),
      );
      const response = yield* httpClient.execute(request);
      const json: unknown = yield* response.json;

      return { response: json };
    }),
  ),
);
