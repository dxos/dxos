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
import { Sequence } from '@dxos/conductor';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { ClientCapabilities } from '@dxos/plugin-client';
import { PLANK_COMPANION_TYPE, ATTENDABLE_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { createExtension, ROOT_ID } from '@dxos/plugin-graph';
import { getActiveSpace, rxFromQuery } from '@dxos/plugin-space';
import { SPACE_TYPE, SpaceAction } from '@dxos/plugin-space/types';
import {
  type Space,
  Filter,
  Query,
  type QueryResult,
  fullyQualifiedId,
  getSpace,
  isSpace,
} from '@dxos/react-client/echo';

import { ASSISTANT_DIALOG, ASSISTANT_PLUGIN } from '../meta';
import { Assistant, AssistantAction, TemplateType } from '../types';

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

                  const space = getActiveSpace(context) ?? client.spaces.default;
                  const chat = await getOrCreateChat(dispatch, space);
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
      connector: (node) => {
        let query: QueryResult<Assistant.Chat> | undefined;
        return Rx.make((get) => {
          const nodeOption = get(node);
          if (Option.isNone(nodeOption)) {
            return [];
          }

          const object = nodeOption.value.data;
          if (!Obj.isObject(object)) {
            return [];
          }

          const space = getSpace(object);
          if (!space) {
            return [];
          }

          if (!query) {
            query = space.db.query(Query.select(Filter.ids(object.id)).targetOf(Assistant.CompanionTo).source());
          }

          const chat = get(rxFromQuery(query))[0];
          return [
            {
              id: [fullyQualifiedId(object), 'assistant-chat'].join(ATTENDABLE_PATH_SEPARATOR),
              type: PLANK_COMPANION_TYPE,
              data: chat ?? 'assistant-chat',
              properties: {
                label: ['assistant chat label', { ns: ASSISTANT_PLUGIN }],
                icon: 'ph--sparkle--regular',
                position: 'hoist',
                disposition: 'hidden',
              },
            },
          ];
        });
      },
    }),

    createExtension({
      id: `${ASSISTANT_PLUGIN}/sequence-logs`,
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (Obj.instanceOf(Sequence, node.data) ? Option.some(node) : Option.none())),
            Option.map((node) => [
              {
                id: [node.id, 'logs'].join(ATTENDABLE_PATH_SEPARATOR),
                type: PLANK_COMPANION_TYPE,
                data: 'logs',
                properties: {
                  label: ['sequence logs label', { ns: ASSISTANT_PLUGIN }],
                  icon: 'ph--clock-countdown--regular',
                  disposition: 'hidden',
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
const getOrCreateChat = async (
  dispatch: PromiseIntentDispatcher,
  space: Space,
): Promise<Assistant.Chat | undefined> => {
  // TODO(wittjosiah): This should be possible with a single query.
  const { objects: allChats } = await space.db.query(Query.type(Assistant.Chat)).run();
  const { objects: relatedChats } = await space.db
    .query(Query.type(Assistant.Chat).sourceOf(Assistant.CompanionTo).source())
    .run();
  const chats = allChats.filter((chat) => !relatedChats.includes(chat));
  // console.log('objects', JSON.stringify(objects, null, 2));
  if (chats.length > 0) {
    // TODO(burdon): Is this the most recent?
    return chats[chats.length - 1];
  }

  const { data } = await dispatch(createIntent(AssistantAction.CreateChat, { space }));
  invariant(Obj.instanceOf(Assistant.Chat, data?.object));
  await dispatch(createIntent(SpaceAction.AddObject, { target: space, object: data.object }));
  return data.object;
};
