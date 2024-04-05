//
// Copyright 2023 DXOS.org
//

import { Asterisk, Placeholder, type IconProps } from '@phosphor-icons/react';
import { effect } from '@preact/signals-core';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { updateGraphWithAddObjectAction } from '@braneframe/plugin-space';
import { resolvePlugin, parseIntentPlugin, type PluginDefinition } from '@dxos/app-framework';
import { EventSubscriptions } from '@dxos/async';
import * as E from '@dxos/react-client/echo';

import { TemplateMain } from './components';
import meta, { TEMPLATE_PLUGIN } from './meta';
import translations from './translations';
import { TemplateAction, type TemplatePluginProvides, isObject } from './types';

const typename = 'template'; // Type.schema.typename

export const TemplatePlugin = (): PluginDefinition<TemplatePluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [typename]: {
            placeholder: ['object placeholder', { ns: TEMPLATE_PLUGIN }],
            icon: (props: IconProps) => <Asterisk {...props} />,
          },
        },
      },
      translations,
      graph: {
        builder: (plugins, graph) => {
          const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
          if (!client || !dispatch) {
            return;
          }

          const subscriptions = new EventSubscriptions();
          const { unsubscribe } = client.spaces.subscribe((spaces) => {
            spaces.forEach((space) => {
              subscriptions.add(
                updateGraphWithAddObjectAction({
                  graph,
                  space,
                  plugin: TEMPLATE_PLUGIN,
                  action: TemplateAction.CREATE,
                  properties: {
                    label: ['create object label', { ns: TEMPLATE_PLUGIN }],
                    icon: (props: IconProps) => <Placeholder {...props} />,
                    testId: 'templatePlugin.createObject',
                  },
                  dispatch,
                }),
              );

              // Add all documents to the graph.
              const query = space.db.query({ type: typename });
              let previousObjects: E.EchoReactiveObject<any>[] = [];
              subscriptions.add(
                effect(() => {
                  const removedObjects = previousObjects.filter((object) => !query.objects.includes(object));
                  previousObjects = query.objects;
                  removedObjects.forEach((object) => graph.removeNode(object.id));
                  query.objects.forEach((object) => {
                    graph.addNodes({
                      id: object.id,
                      data: object,
                      properties: {
                        // TODO(wittjosiah): Reconcile with metadata provides.
                        label: object.title || ['object title placeholder', { ns: TEMPLATE_PLUGIN }],
                        icon: (props: IconProps) => <Placeholder {...props} />,
                        testId: 'spacePlugin.object',
                        persistenceClass: 'echo',
                        persistenceKey: space?.key.toHex(),
                      },
                    });
                  });
                }),
              );
            });
          });

          return () => {
            unsubscribe();
            subscriptions.clear();
          };
        },
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main': {
              return isObject(data.active) ? <TemplateMain object={data.active} /> : null;
            }
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case TemplateAction.CREATE: {
              // TODO(burdon): Set typename.
              return { data: E.object({ type: 'template' }) };
            }
          }
        },
      },
    },
  };
};
