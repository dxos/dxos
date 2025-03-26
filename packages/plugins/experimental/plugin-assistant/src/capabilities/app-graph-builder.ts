//
// Copyright 2025 DXOS.org
//

import {
  Capabilities,
  contributes,
  createIntent,
  LayoutAction,
  type PromiseIntentDispatcher,
  type PluginsContext,
} from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { ClientCapabilities } from '@dxos/plugin-client';
import { createExtension, type Node, ROOT_ID } from '@dxos/plugin-graph';
import { memoizeQuery } from '@dxos/plugin-space';
import { SpaceAction } from '@dxos/plugin-space/types';
import { type Space, Filter, fullyQualifiedId, getSpace, isSpace } from '@dxos/react-client/echo';

import { ASSISTANT_DIALOG, ASSISTANT_PLUGIN } from '../meta';
import { AIChatType, AssistantAction, TemplateType } from '../types';

export default (context: PluginsContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${ASSISTANT_PLUGIN}/assistant`,
      filter: (node): node is Node<null> => node.id === ROOT_ID,
      actions: () => [
        {
          id: `${LayoutAction.UpdateDialog._tag}/assistant/open`,
          data: async () => {
            const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
            const client = context.requestCapability(ClientCapabilities.Client);
            const layout = context.requestCapability(Capabilities.Layout);
            const { graph } = context.requestCapability(Capabilities.AppGraph);

            // TODO(burdon): Get space from workspace.
            // TODO(burdon): If need to create chat, then add to dispatch stack below.
            let chat: AIChatType | undefined;
            if (layout.active.length > 0) {
              const node = graph.findNode(layout.active[0]);
              if (node) {
                const space = getSpace(node.data);
                if (space) {
                  chat = await getOrCreateChat(dispatch, space);
                }
              }
            } else {
              const space = client.spaces.default;
              chat = await getOrCreateChat(dispatch, space);
            }

            if (!chat) {
              return;
            }

            await dispatch(
              createIntent(LayoutAction.UpdateDialog, {
                part: 'dialog',
                subject: ASSISTANT_DIALOG,
                options: {
                  state: true,
                  blockAlign: 'end',
                  props: {
                    chat,
                  },
                },
              }),
            );
          },
          properties: {
            label: ['open assistant label', { ns: ASSISTANT_PLUGIN }],
            icon: 'ph--chat-centered-text--regular',
            disposition: 'pin-end',
            position: 'hoist',
            keyBinding: {
              macos: 'shift+meta+k',
              windows: 'shift+ctrl+k',
            },
          },
        },
      ],
    }),

    createExtension({
      id: `${ASSISTANT_PLUGIN}/root`,
      filter: (node): node is Node<Space> => isSpace(node.data),
      connector: ({ node }) => {
        const templates = memoizeQuery(node.data, Filter.schema(TemplateType));
        return templates.length > 0
          ? [
              {
                id: `${ASSISTANT_PLUGIN}/templates`,
                type: `${ASSISTANT_PLUGIN}/templates`,
                data: null,
                properties: {
                  label: ['templates label', { ns: ASSISTANT_PLUGIN }],
                  icon: 'ph--file-code--regular',
                  space: node.data,
                },
              },
            ]
          : [];
      },
    }),

    createExtension({
      id: `${ASSISTANT_PLUGIN}/templates`,
      filter: (node): node is Node<null, { space: Space }> => node.id === `${ASSISTANT_PLUGIN}/templates`,
      connector: ({ node }) => {
        const templates = memoizeQuery(node.properties.space, Filter.schema(TemplateType));
        return templates
          .toSorted((a, b) => {
            const nameA = a.name ?? '';
            const nameB = b.name ?? '';
            return nameA.localeCompare(nameB);
          })
          .map((template) => ({
            id: fullyQualifiedId(template),
            type: `${ASSISTANT_PLUGIN}/template`,
            data: template,
            properties: {
              label: template.name ?? ['template title placeholder', { ns: ASSISTANT_PLUGIN }],
              icon: 'ph--file-code--regular',
            },
          }));
      },
    }),
  ]);

// TODO(burdon): Factor out.
const getOrCreateChat = async (dispatch: PromiseIntentDispatcher, space: Space): Promise<AIChatType | undefined> => {
  const { objects } = await space.db.query(Filter.schema(AIChatType)).run();
  // console.log('objects', JSON.stringify(objects, null, 2));
  if (objects.length > 0) {
    // TODO(burdon): Is this the most recent?
    return objects[objects.length - 1];
  }

  const { data } = await dispatch(createIntent(AssistantAction.CreateChat, { spaceId: space.id }));
  invariant(data?.object instanceof AIChatType);
  await dispatch(createIntent(SpaceAction.AddObject, { target: space, object: data.object }));
  return data.object;
};
