//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ObservabilityCapabilities from '@dxos/plugin-observability/ObservabilityCapabilities';

import { SupportOperation, SupportService } from '#types';

import { SupportSubmitError, SupportUnavailableError } from '../errors';

const handler: Operation.WithHandler<typeof SupportOperation.SubmitReport> = SupportOperation.SubmitReport.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const client = yield* Capability.get(ClientCapabilities.Client);
      const observability = yield* Capability.get(ObservabilityCapabilities.Observability);
      const endpoint = SupportService.supportEndpoint(client.config);
      if (!endpoint) {
        return yield* Effect.fail(new SupportUnavailableError());
      }
      return yield* Effect.tryPromise({
        try: () =>
          SupportService.submitSupportReport({
            endpoint,
            observability,
            report: input.report,
            did: input.did,
            screenshotUrl: input.screenshotUrl,
          }),
        catch: (cause) => new SupportSubmitError({ cause }),
      });
    }),
  ),
);

export default handler;
