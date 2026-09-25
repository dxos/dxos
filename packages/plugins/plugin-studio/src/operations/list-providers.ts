//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { JsonSchema } from '@dxos/echo';

import { StudioCapabilities, StudioOperation } from '#types';

const handler: Operation.WithHandler<typeof StudioOperation.ListProviders> = StudioOperation.ListProviders.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ kind }) {
      const services = (yield* Capability.contributions(StudioCapabilities.GenerationService)).get();
      return {
        providers: services
          .filter((service) => !kind || service.kind === kind)
          .map((service) => ({
            id: service.id,
            kind: service.kind,
            label: service.label,
            requestSchema: JsonSchema.toJsonSchema(service.requestSchema),
            defaultRequest: service.defaultRequest,
          })),
      };
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
