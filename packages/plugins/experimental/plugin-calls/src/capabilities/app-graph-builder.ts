//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';
import { createExtension, toSignal } from '@dxos/plugin-graph';
import { SpaceState, parseId } from '@dxos/react-client/echo';

import { CALLS_PLUGIN } from '../meta';

export default (context: PluginsContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${CALLS_PLUGIN}/assistant-for-subject`,
      resolver: ({ id }) => {
        // TODO(Zan): Find util (or make one). Effect schema!!
        if (!id.endsWith('~calls')) {
          return;
        }

        const client = context.requestCapability(ClientCapabilities.Client);
        const [subjectId] = id.split('~');
        const { spaceId } = parseId(subjectId);
        const spaces = toSignal(
          (onChange) => client.spaces.subscribe(() => onChange()).unsubscribe,
          () => client.spaces.get(),
        );
        const space = spaces?.find((space) => space.id === spaceId && space.state.get() === SpaceState.SPACE_READY);
        return {
          id,
          type: 'orphan-calls-for-subject',
          data: null,
          properties: {
            icon: 'ph--phone-call--regular',
            label: ['calls panel label', { ns: CALLS_PLUGIN }],
            space,
          },
        };
      },
    }),
  ]);
