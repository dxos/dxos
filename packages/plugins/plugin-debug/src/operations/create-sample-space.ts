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
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { DebugOperation } from '#types';

import { SampleSpaceApplyError, SampleSpaceNotFoundError } from '../errors';

const summarize = ({ id, label, description }: AppCapabilities.SampleSpace) => ({ id, label, description });

const handler: Operation.WithHandler<typeof DebugOperation.CreateSampleSpace> = DebugOperation.CreateSampleSpace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ id }) {
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
          new SampleSpaceNotFoundError({ context: { id, available: available.map(({ id }) => id) } }),
        );
      }

      // Delegated rather than `client.spaces.create`: the space operation is what waits for ready,
      // installs the root collection annotation and runs the OnCreateSpace callbacks, and content
      // written into a space missing that root collection is unreachable from the navtree.
      const { space, subject } = yield* Operation.invoke(SpaceOperation.Create, { name: sample.label });
      const client = yield* Capability.get(ClientCapabilities.Client);
      yield* Effect.tryPromise({
        try: () => sample.apply({ client, space }),
        catch: (cause) => new SampleSpaceApplyError({ context: { id: sample.id }, cause }),
      });

      return { applied: summarize(sample), spaceId: space.id, subject, available };
    }),
  ),
);

export default handler;
