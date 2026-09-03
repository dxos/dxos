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

import { DebugOperation } from '#types';

import { SampleSpaceNotFoundError, SpaceNotFoundError } from '../errors';

const summarize = ({ id, label, description }: AppCapabilities.SampleSpace) => ({ id, label, description });

const handler: Operation.WithHandler<typeof DebugOperation.CreateSampleSpace> = DebugOperation.CreateSampleSpace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ id, spaceId }) {
      // The same demand signal the generator panel fires on mount: nothing else activates these
      // modules, so without it the list is empty on a cold app.
      yield* Plugin.activate(ActivationEvents.SampleSpacesRequested);
      const samples = yield* Capability.getAll(AppCapabilities.SampleSpace);
      const available = samples.map(summarize);
      if (!id) {
        return { available };
      }

      const sample = samples.find((sample) => sample.id === id);
      if (!sample) {
        return yield* Effect.fail(
          new SampleSpaceNotFoundError({ context: { id, available: available.map((s) => s.id) } }),
        );
      }

      const client = yield* Capability.get(ClientCapabilities.Client);
      // `AppSpace.getDefaultSpace` rather than a `spaces.default` accessor: the designation lives on
      // the settings space, with a fallback to the legacy personal space for unmigrated profiles.
      const space = spaceId
        ? client.spaces.get().find((space) => space.id === spaceId)
        : AppSpace.getDefaultSpace(client);
      if (!space) {
        return yield* Effect.fail(new SpaceNotFoundError({ context: { spaceId } }));
      }

      yield* Effect.tryPromise({
        // `apply` registers the content's types on the client before writing, so the space needs no
        // preparation here beyond being ready.
        try: () => sample.apply({ client, space }),
        catch: (cause) => cause as Error,
      });

      return { applied: summarize(sample), available };
    }),
  ),
);

export default handler;
