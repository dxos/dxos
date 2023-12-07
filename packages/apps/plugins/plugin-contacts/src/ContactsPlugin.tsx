//
// Copyright 2023 DXOS.org
//

import { AddressBook, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { SPACE_PLUGIN, SpaceAction } from '@braneframe/plugin-space';
import { Folder, AddressBook as AddressBookType } from '@braneframe/types';
import { LayoutAction, type PluginDefinition, parseIntentPlugin, resolvePlugin } from '@dxos/app-framework';
import { SpaceProxy } from '@dxos/react-client/echo';

import { ContactsMain } from './components';
import meta, { CONTACTS_PLUGIN } from './meta';
import translations from './translations';
import { ContactsAction, type ContactsPluginProvides, isObject } from './types';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[AddressBookType.name] = AddressBookType;

export const ContactsPlugin = (): PluginDefinition<ContactsPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [AddressBookType.schema.typename]: {
            placeholder: ['object title placeholder', { ns: CONTACTS_PLUGIN }],
            icon: (props: IconProps) => <AddressBook {...props} />,
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
            id: `${CONTACTS_PLUGIN}/create`,
            label: ['create object label', { ns: CONTACTS_PLUGIN }],
            icon: (props) => <AddressBook {...props} />,
            invoke: () =>
              intentPlugin?.provides.intent.dispatch([
                {
                  plugin: CONTACTS_PLUGIN,
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
              testId: 'contactsPlugin.createObject',
            },
          });
        },
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main':
              return isObject(data.active) ? <ContactsMain contacts={data.active} /> : null;
            default:
              return null;
          }
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case ContactsAction.CREATE: {
              return { object: new AddressBookType() };
            }
          }
        },
      },
    },
  };
};
