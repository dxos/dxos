//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import * as Operation from '@dxos/compute/Operation';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { DebugOperation } from '#types';

import { SpaceTemplateApplyError, SpaceTemplateNotFoundError } from '../errors.ts';

const summarize = ({ id, label, description }: AppCapabilities.SpaceTemplate) => ({ id, label, description });

const handler: Operation.WithHandler<typeof DebugOperation.CreateSpaceFromTemplate> =
  DebugOperation.CreateSpaceFromTemplate.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ id }) {
        yield* Plugin.activate(ActivationEvents.SpaceTemplatesRequested);
        const templates = yield* Capability.getAll(AppCapabilities.SpaceTemplate);
        const available = templates.map(summarize);
        if (!id) {
          return { available };
        }

        const template = templates.find((template) => template.id === id);
        if (!template) {
          return yield* Effect.fail(
            new SpaceTemplateNotFoundError({ context: { id, available: available.map(({ id }) => id) } }),
          );
        }

        const { space, subject } = yield* Operation.invoke(SpaceOperation.Create, {
          name: template.label,
          icon: template.icon,
          hue: template.hue,
        });
        const client = yield* Capability.get(ClientCapabilities.Client);
        AppSpace.setSpaceTemplateId(space, template.id);
        yield* Effect.tryPromise({
          try: () => template.apply({ client, space }),
          catch: (cause) => new SpaceTemplateApplyError({ context: { id: template.id }, cause }),
        }).pipe(Effect.tapError(() => Effect.ignore(Operation.invoke(SpaceOperation.Delete, { space }))));

        return { applied: summarize(template), spaceId: space.id, subject, available };
      }),
    ),
  );

export default handler;
