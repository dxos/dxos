//
// Copyright 2023 DXOS.org
//

import { Chat, type IconProps } from '@phosphor-icons/react';
import { deepSignal } from 'deepsignal';
import React from 'react';

import { getActiveSpace, SPACE_PLUGIN, SpaceAction } from '@braneframe/plugin-space';
import { Folder, Thread as ThreadType } from '@braneframe/types';
import {
  LayoutAction,
  type GraphProvides,
  type IntentPluginProvides,
  type LayoutProvides,
  type Plugin,
  type PluginDefinition,
  parseIntentPlugin,
  parseLayoutPlugin,
  parseGraphPlugin,
  resolvePlugin,
} from '@dxos/app-framework';
import { type TypedObject, SpaceProxy } from '@dxos/react-client/echo';
import { nonNullable } from '@dxos/util';

import { CommentsSidebar, ThreadMain, ThreadSidebar } from './components';
import meta, { THREAD_ITEM, THREAD_PLUGIN } from './meta';
import translations from './translations';
import { ThreadAction, type ThreadPluginProvides, isThread } from './types';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[ThreadType.name] = ThreadType;

type CommentThread = {
  id: string;
  y: number;
};

export const ThreadPlugin = (): PluginDefinition<ThreadPluginProvides> => {
  let graphPlugin: Plugin<GraphProvides> | undefined;
  let layoutPlugin: Plugin<LayoutProvides> | undefined;
  let intentPlugin: Plugin<IntentPluginProvides> | undefined;

  const state = deepSignal<{ active?: string | undefined; threads?: CommentThread[] }>({});

  return {
    meta,
    ready: async (plugins) => {
      graphPlugin = resolvePlugin(plugins, parseGraphPlugin);
      layoutPlugin = resolvePlugin(plugins, parseLayoutPlugin);
      intentPlugin = resolvePlugin(plugins, parseIntentPlugin)!;
    },
    provides: {
      metadata: {
        records: {
          [ThreadType.schema.typename]: {
            placeholder: ['thread title placeholder', { ns: THREAD_PLUGIN }],
            icon: (props: IconProps) => <Chat {...props} />,
          },
          [THREAD_ITEM]: {
            parse: (item: TypedObject, type: string) => {
              switch (type) {
                case 'node':
                  return { id: item.id, label: item.title, data: item };
                case 'object':
                  return item;
                case 'view-object':
                  return { id: `${item.id}-view`, object: item };
              }
            },
          },
        },
      },
      translations,
      graph: {
        builder: ({ parent, plugins }) => {
          if (!(parent.data instanceof Folder || parent.data instanceof SpaceProxy)) {
            return;
          }

          parent.actionsMap[`${SPACE_PLUGIN}/create`]?.addAction({
            id: `${THREAD_PLUGIN}/create`,
            label: ['create thread label', { ns: THREAD_PLUGIN }],
            icon: (props) => <Chat {...props} />,
            invoke: () =>
              intentPlugin?.provides.intent.dispatch([
                {
                  plugin: THREAD_PLUGIN,
                  action: ThreadAction.CREATE,
                },
                {
                  action: SpaceAction.ADD_OBJECT,
                  data: { target: parent.data },
                },
                {
                  action: LayoutAction.ACTIVATE,
                },
              ]),
            properties: {
              testId: 'threadPlugin.createObject',
            },
          });
        },
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main': {
              return isThread(data.active) ? <ThreadMain thread={data.active} /> : null;
            }

            case 'context-thread': {
              const graph = graphPlugin?.provides.graph;
              const layout = layoutPlugin?.provides.layout;

              const space = getActiveSpace(graph!, layout!.active);
              if (space) {
                // TODO(burdon): Hack to determine if comments should be visible.
                let comments = false;
                if (layout?.active) {
                  const active = space.db.getObjectById(layout?.active);
                  comments = (active as any)?.comments?.length > 0;
                }
                if (!comments) {
                  state.threads = [];
                }

                if (state.threads?.length) {
                  const threads = state.threads
                    .map(({ id }) => space.db.getObjectById(id) as ThreadType)
                    .filter(nonNullable);

                  return (
                    <CommentsSidebar
                      space={space}
                      threads={threads}
                      active={state.active}
                      onFocus={(thread: ThreadType) => {
                        if (state.active !== thread.id) {
                          state.active = thread.id;
                          void intentPlugin?.provides.intent.dispatch({
                            action: LayoutAction.FOCUS,
                            data: {
                              object: thread.id,
                            },
                          });
                        }
                      }}
                    />
                  );
                } else {
                  return <ThreadSidebar space={space} />;
                }
              } else {
                return null;
              }
            }

            default:
              return null;
          }
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case ThreadAction.CREATE: {
              return { object: new ThreadType() };
            }
            case ThreadAction.SELECT: {
              state.active = intent.data?.active;
              state.threads = intent.data?.threads;
              break;
            }
          }
        },
      },
    },
  };
};
