//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';
import { createExtension, toSignal } from '@dxos/plugin-graph';
import { memoizeQuery } from '@dxos/plugin-space';
import { parseId, SpaceState } from '@dxos/react-client/echo';

import { TABLE_PLUGIN } from '../meta';

const AppGraphBuilder = (context: PluginsContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${TABLE_PLUGIN}/selected-objects-for-subject`,
      resolver: ({ id }) => {
        if (!id.endsWith('~selected-objects')) {
          return;
        }

        const type = 'orphan-selected-objects-for-subject';

        const client = context.requestCapability(ClientCapabilities.Client);
        const [subjectId] = id.split('~');
        const { spaceId, objectId } = parseId(subjectId);
        const spaces = toSignal(
          (onChange) => client.spaces.subscribe(() => onChange()).unsubscribe,
          () => client.spaces.get(),
        );
        const space = spaces?.find((space) => space.state.get() === SpaceState.SPACE_READY && space.id === spaceId);

        const [object] = memoizeQuery(space, { id: objectId });
        if (!object || !subjectId) {
          return;
        }

        return {
          id,
          type,
          data: null,
          properties: { object },
        };
      },
    }),
  ]);

export default AppGraphBuilder;
