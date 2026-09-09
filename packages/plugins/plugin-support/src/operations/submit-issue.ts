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

const handler: Operation.WithHandler<typeof SupportOperation.SubmitIssue> = SupportOperation.SubmitIssue.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const client = yield* Capability.get(ClientCapabilities.Client);
      const observability = yield* Capability.get(ObservabilityCapabilities.Observability);
      const endpoint = SupportService.supportEndpoint(client.config);
      if (!endpoint) {
        return yield* Effect.fail(new SupportUnavailableError());
      }
      const did = client.halo.identity.get()?.did;
      if (!did) {
        return yield* Effect.fail(new SupportSubmitError({ context: { reason: 'no identity to file the issue as' } }));
      }
      const version = input.report.version ?? client.config.values.runtime?.app?.build?.version;
      return yield* SupportService.submitSupportIssue({
        endpoint,
        observability,
        report: { ...input.report, version },
        did,
        screenshotUrl: input.screenshotUrl,
      });
    }),
  ),
);

export default handler;
