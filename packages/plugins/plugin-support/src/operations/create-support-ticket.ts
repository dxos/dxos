//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as ObservabilityCapabilities from '@dxos/plugin-observability/ObservabilityCapabilities';

import { SupportOperation } from '#types';

const handler: Operation.WithHandler<typeof SupportOperation.CreateSupportTicket> =
  SupportOperation.CreateSupportTicket.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* (input) {
        const observability = yield* Capability.get(ObservabilityCapabilities.Observability);
        const ticketId = yield* Effect.promise(() =>
          observability.support.createSupportTicket({ message: input.message, includeLogs: input.includeLogs }),
        );
        return ticketId;
      }),
    ),
  );

export default handler;
