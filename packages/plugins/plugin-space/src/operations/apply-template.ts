//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Operation from '@dxos/compute/Operation';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { SpaceOperation } from '#types';

import { TemplateApplyError, TemplateNotFoundError } from '../errors.ts';

const handler: Operation.WithHandler<typeof SpaceOperation.ApplyTemplate> = SpaceOperation.ApplyTemplate.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ template, space }) {
      yield* Plugin.activate(ActivationEvents.SpaceTemplatesRequested);
      const templates = yield* Capability.getAll(AppCapabilities.SpaceTemplate);
      const match = templates.find(({ id }) => id === template);
      if (!match) {
        return yield* Effect.fail(new TemplateNotFoundError({ context: { template } }));
      }

      const client = yield* Capability.get(ClientCapabilities.Client);
      yield* match
        .apply({ client, space })
        .pipe(Effect.mapError((cause) => new TemplateApplyError({ context: { template, spaceId: space.id }, cause })));
    }),
  ),
);

export default handler;
