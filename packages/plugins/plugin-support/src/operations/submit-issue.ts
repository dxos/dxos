//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ObservabilityCapabilities from '@dxos/plugin-observability/ObservabilityCapabilities';

import { SupportOperation } from '#types';

const handler: Operation.WithHandler<typeof SupportOperation.SubmitIssue> = SupportOperation.SubmitIssue.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const client = yield* Capability.get(ClientCapabilities.Client);
      const observability = yield* Capability.get(ObservabilityCapabilities.Observability);
      const endpoint = SupportOperation.supportEndpoint(client.config);
      if (!endpoint) {
        return yield* Effect.fail(new Error('No support service is configured.'));
      }
      const did = client.halo.identity.get()?.did;
      if (!did) {
        return yield* Effect.fail(new Error('No identity to file the issue as.'));
      }
      // The version is what the feedback panel fills in for the user; a console command has no panel.
      const version = input.report.version ?? client.config.values.runtime?.app?.build?.version;
      return yield* Effect.tryPromise({
        try: () =>
          SupportOperation.submitSupportIssue({
            endpoint,
            observability,
            report: { ...input.report, version },
            did,
            screenshotUrl: input.screenshotUrl,
          }),
        catch: (cause) => (cause instanceof Error ? cause : new Error(String(cause))),
      });
    }),
  ),
);

export default handler;
