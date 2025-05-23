//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import { Option, pipe } from 'effect';

import {
  Capabilities,
  contributes,
  createIntent,
  LayoutAction,
  type PromiseIntentDispatcher,
  type PluginContext,
} from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { ClientCapabilities } from '@dxos/plugin-client';
import { PLANK_COMPANION_TYPE, ATTENDABLE_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { createExtension, ROOT_ID } from '@dxos/plugin-graph';
import { rxFromQuery } from '@dxos/plugin-space';
import { SPACE_TYPE, SpaceAction } from '@dxos/plugin-space/types';
import {
  type Space,
  Filter,
  fullyQualifiedId,
  getSpace,
  isLiveObject,
  isSpace,
  Query,
  type QueryResult,
} from '@dxos/react-client/echo';

import { ASSISTANT_DIALOG, ASSISTANT_PLUGIN } from '../meta';
import { AIChatType, AssistantAction, TemplateType } from '../types';

export default (context: PluginContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${ASSISTANT_PLUGIN}/assistant`,
      actions: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (node.id === ROOT_ID ? Option.some(node) : Option.none())),
            Option.map(() => [
              {
                id: `${LayoutAction.UpdateDialog._tag}/assistant/open`,
                data: async () => {
                  const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
                  const client = context.getCapability(ClientCapabilities.Client);
                  const layout = context.getCapability(Capabilities.Layout);
                  const { graph } = context.getCapability(Capabilities.AppGraph);

                  // TODO(burdon): Get space from workspace.
                  // TODO(burdon): If need to create chat, then add to dispatch stack below.
                  let chat: AIChatType | undefined;
                  if (layout.active.length > 0) {
                    const node = graph.getNode(layout.active[0]).pipe(Option.getOrNull);
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
                  icon: 'ph--sparkle--regular',
                  disposition: 'pin-end',
                  position: 'hoist',
                  keyBinding: {
                    macos: 'shift+meta+k',
                    windows: 'shift+ctrl+k',
                  },
                },
              },
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),

    createExtension({
      id: `${ASSISTANT_PLUGIN}/object-chat-companion`,
      // TODO(burdon): Add to all objects?
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) =>
              isLiveObject(node.data) && node.data.assistantChatQueue && node.data.type !== AIChatType.typename
                ? Option.some(node)
                : Option.none(),
            ),
            Option.map((node) => [
              {
                id: [node.id, 'assistant-chat'].join(ATTENDABLE_PATH_SEPARATOR),
                type: PLANK_COMPANION_TYPE,
                data: 'assistant-chat',
                properties: {
                  label: ['assistant chat label', { ns: ASSISTANT_PLUGIN }],
                  icon: 'ph--sparkle--regular',
                  position: 'hoist',
                },
              },
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),

    createExtension({
      id: `${ASSISTANT_PLUGIN}/root`,
      connector: (node) => {
        let query: QueryResult<TemplateType> | undefined;
        return Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) =>
              node.type === SPACE_TYPE && isSpace(node.data) ? Option.some(node.data) : Option.none(),
            ),
            Option.map((space) => {
              if (!query) {
                query = space.db.query(Query.type(TemplateType));
              }

              const templates = get(rxFromQuery(query));
              return templates.length > 0
                ? [
                    {
                      id: `${ASSISTANT_PLUGIN}/templates`,
                      type: `${ASSISTANT_PLUGIN}/templates`,
                      data: null,
                      properties: {
                        label: ['templates label', { ns: ASSISTANT_PLUGIN }],
                        icon: 'ph--file-code--regular',
                        space,
                      },
                    },
                  ]
                : [];
            }),
            Option.getOrElse(() => []),
          ),
        );
      },
    }),

    createExtension({
      id: `${ASSISTANT_PLUGIN}/templates`,
      connector: (node) => {
        let query: QueryResult<TemplateType> | undefined;
        return Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) =>
              node.id === `${ASSISTANT_PLUGIN}/templates` && isSpace(node.properties.space)
                ? Option.some(node.properties.space)
                : Option.none(),
            ),
            Option.map((space) => {
              if (!query) {
                query = space.db.query(Query.type(TemplateType));
              }
              return get(rxFromQuery(query))
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
                    label: template.name ?? ['object placeholder', { ns: ASSISTANT_PLUGIN }],
                    icon: 'ph--file-code--regular',
                  },
                }));
            }),
            Option.getOrElse(() => []),
          ),
        );
      },
    }),
  ]);

// TODO(burdon): Factor out.
const getOrCreateChat = async (dispatch: PromiseIntentDispatcher, space: Space): Promise<AIChatType | undefined> => {
  const { objects } = await space.db.query(Filter.type(AIChatType)).run();
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
