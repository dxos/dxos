//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ObservabilityCapabilities from '@dxos/plugin-observability/ObservabilityCapabilities';

import { SupportOperation } from '#types';

const handler: Operation.WithHandler<typeof SupportOperation.SubmitReport> = SupportOperation.SubmitReport.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const client = yield* Capability.get(ClientCapabilities.Client);
      const observability = yield* Capability.get(ObservabilityCapabilities.Observability);
      const endpoint = SupportOperation.supportEndpoint(client.config);
      if (!endpoint) {
        return yield* Effect.fail(new Error('No support service is configured.'));
      }
      return yield* Effect.tryPromise({
        try: () =>
          SupportOperation.submitSupportReport({
            endpoint,
            observability,
            report: input.report,
            did: input.did,
            screenshotUrl: input.screenshotUrl,
          }),
        catch: (cause) => (cause instanceof Error ? cause : new Error(String(cause))),
      });
    }),
  ),
);

export default handler;
