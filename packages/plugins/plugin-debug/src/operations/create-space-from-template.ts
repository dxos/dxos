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
        // The same demand signal the generator panel fires on mount: nothing else activates these
        // modules, so without it the list is empty on a cold app. Hidden templates are listed: this
        // operation is the by-id path the flag reserves them for.
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

        // Delegated rather than `client.spaces.create`: the space operation is what waits for ready,
        // installs the root collection annotation and runs the OnCreateSpace callbacks, and content
        // written into a space missing that root collection is unreachable from the navtree.
        //
        // The template's styling is passed rather than its id: letting `Create` apply it would fail
        // before this handler holds a space, leaving the half-written space the cleanup below deletes.
        const { space, subject } = yield* Operation.invoke(SpaceOperation.Create, {
          name: template.label,
          icon: template.icon,
          hue: template.hue,
        });
        const client = yield* Capability.get(ClientCapabilities.Client);
        // What `Create` records when it applies a template itself, written here for the path that
        // does not — a space's origin should not depend on which caller filled it.
        AppSpace.setSpaceTemplateId(space, template.id);
        yield* Effect.tryPromise({
          try: () => template.apply({ client, space }),
          catch: (cause) => new SpaceTemplateApplyError({ context: { id: template.id }, cause }),
        }).pipe(
          // The space is created before it can be filled, so a failed apply would otherwise leave a
          // half-populated space in the profile. Cleanup is ignored rather than propagated: a failure
          // to delete must not replace the error that explains what actually went wrong.
          Effect.tapError(() => Effect.ignore(Operation.invoke(SpaceOperation.Delete, { space }))),
        );

        return { applied: summarize(template), spaceId: space.id, subject, available };
      }),
    ),
  );

export default handler;
