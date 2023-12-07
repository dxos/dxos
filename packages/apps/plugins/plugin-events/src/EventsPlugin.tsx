//
// Copyright 2023 DXOS.org
//

import { Calendar, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { SPACE_PLUGIN, SpaceAction } from '@braneframe/plugin-space';
import { Folder, Calendar as CalendarType } from '@braneframe/types';
import { LayoutAction, type PluginDefinition, parseIntentPlugin, resolvePlugin } from '@dxos/app-framework';
import { SpaceProxy } from '@dxos/react-client/echo';

import { EventsMain } from './components';
import meta, { EVENTS_PLUGIN } from './meta';
import translations from './translations';
import { ContactsAction, type ContactsPluginProvides, isObject } from './types';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[CalendarType.name] = CalendarType;

export const EventsPlugin = (): PluginDefinition<ContactsPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [CalendarType.schema.typename]: {
            placeholder: ['object title placeholder', { ns: EVENTS_PLUGIN }],
            icon: (props: IconProps) => <Calendar {...props} />,
          },
        },
      },
      translations,
      graph: {
        builder: ({ parent, plugins }) => {
          // TODO(burdon): Remove refs to SpaceProxy.
          if (!(parent.data instanceof Folder || parent.data instanceof SpaceProxy)) {
            return;
          }

          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

          parent.actionsMap[`${SPACE_PLUGIN}/create`]?.addAction({
            id: `${EVENTS_PLUGIN}/create`,
            label: ['create object label', { ns: EVENTS_PLUGIN }],
            icon: (props) => <Calendar {...props} />,
            invoke: () =>
              intentPlugin?.provides.intent.dispatch([
                {
                  plugin: EVENTS_PLUGIN,
                  action: ContactsAction.CREATE,
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
              testId: 'eventsPlugin.createObject',
            },
          });
        },
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main':
              return isObject(data.active) ? <EventsMain calendar={data.active} /> : null;
            default:
              return null;
          }
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case ContactsAction.CREATE: {
              return { object: new CalendarType() };
            }
          }
        },
      },
    },
  };
};
