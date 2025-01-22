//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createIntent, type PluginsContext } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';
import { createExtension, toSignal } from '@dxos/plugin-graph';
import { ObservabilityAction } from '@dxos/plugin-observability/types';
import { memoizeQuery } from '@dxos/plugin-space';
import { getTypename, parseId, SpaceState } from '@dxos/react-client/echo';

import { ThreadCapabilities } from './capabilities';
import { THREAD_PLUGIN } from '../meta';

const type = 'orphan-comments-for-subject';
const icon = 'ph--chat-text--regular';

export default (context: PluginsContext) => {
  const resolver = (typename: string) =>
    context.requestCapabilities(Capabilities.Metadata).find(({ id }) => id === typename)?.metadata ?? {};

  return contributes(
    Capabilities.AppGraphBuilder,
    createExtension({
      id: `${THREAD_PLUGIN}/comments-for-subject`,
      resolver: ({ id }) => {
        // TODO(Zan): Find util (or make one).
        if (!id.endsWith('~comments')) {
          return;
        }

        const client = context.requestCapability(ClientCapabilities.Client);
        const [subjectId] = id.split('~');
        const { spaceId, objectId } = parseId(subjectId);
        const spaces = toSignal(
          (onChange) => client.spaces.subscribe(() => onChange()).unsubscribe,
          () => client.spaces.get(),
        );
        const space = spaces?.find((space) => space.id === spaceId && space.state.get() === SpaceState.SPACE_READY);
        if (!objectId) {
          // TODO(wittjosiah): Support comments for arbitrary subjects.
          //   This is to ensure that the comments panel is not stuck on an old object.
          return {
            id,
            type,
            data: null,
            properties: {
              icon,
              label: ['unnamed object threads label', { ns: THREAD_PLUGIN }],
              showResolvedThreads: false,
              object: null,
              space,
            },
          };
        }

        const [object] = memoizeQuery(space, { id: objectId });
        if (!object || !subjectId) {
          return;
        }

        const meta = resolver(getTypename(object) ?? '');
        const label = meta.label?.(object) ||
          object.name ||
          meta.placeholder || ['unnamed object threads label', { ns: THREAD_PLUGIN }];

        const { getViewState } = context.requestCapability(ThreadCapabilities.State);
        const viewState = getViewState(subjectId);

        return {
          id,
          type,
          data: null,
          properties: {
            icon,
            label,
            showResolvedThreads: viewState.showResolvedThreads,
            object,
          },
        };
      },
      actions: ({ node }) => {
        const dataId = node.id.split('~').at(0);
        if (!node.id.endsWith('~comments') || !dataId) {
          return;
        }

        const [spaceId, objectId] = dataId.split(':');

        const { getViewState } = context.requestCapability(ThreadCapabilities.State);
        const viewState = getViewState(dataId);
        const toggle = async () => {
          const newToggleState = !viewState.showResolvedThreads;
          viewState.showResolvedThreads = newToggleState;
          const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
          await dispatch(
            createIntent(ObservabilityAction.SendEvent, {
              name: 'threads.toggle-show-resolved',
              properties: { spaceId, threadId: objectId, showResolved: newToggleState },
            }),
          );
        };

        return [
          {
            id: `${THREAD_PLUGIN}/toggle-show-resolved/${node.id}`,
            data: toggle,
            properties: {
              label: ['toggle show resolved', { ns: THREAD_PLUGIN }],
              menuItemType: 'toggle',
              isChecked: viewState.showResolvedThreads,
              testId: 'threadPlugin.toggleShowResolved',
              icon: viewState.showResolvedThreads ? 'ph--eye-slash--regular' : 'ph--eye--regular',
            },
          },
        ];
      },
    }),
  );
};
