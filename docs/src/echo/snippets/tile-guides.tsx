//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Listbox from '@dxos/react-ui/Listbox';
import * as Status from '@dxos/react-ui/Status';
import { withTheme } from '@dxos/react-ui/testing';
import * as Theme from '@dxos/react-ui/Theme';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { translations as uiTranslations } from '@dxos/react-ui/translations';

// #region resource
const ns = 'com.example.contacts';

export const translations = [
  {
    'en-US': {
      [ns]: {
        'add.label': 'Add contact',
        'count.label_one': '{{count}} contact',
        'count.label_other': '{{count}} contacts',
        'empty.message': 'No contacts yet',
        'list.label': 'Contacts',
      },
    },
  },
] as const satisfies Theme.Resource[];
// #endregion

// #region use-translation
export const ContactsToolbar = ({ count }: { count: number }) => {
  const { t } = Hooks.useTranslation(ns);
  return (
    <Toolbar.Root>
      <Toolbar.Text>{t('count.label', { count })}</Toolbar.Text>
      <Toolbar.Separator variant='gap' />
      <Button.Root icon='ph--plus--regular' label={t('add.label')} iconOnly />
    </Toolbar.Root>
  );
};
// #endregion

// #region provider
export const App = () => (
  <Theme.Provider
    tx={Theme.defaultTx}
    resourceExtensions={[...uiTranslations, ...translations]}
  >
    <ContactsToolbar count={3} />
  </Theme.Provider>
);
// #endregion

// #region component
export type ContactListProps = {
  contacts: { id: string; name: string }[];
  onSelect?: (id: string) => void;
};

/** Takes its data and callbacks as props; a container reads them from the app and passes them in. */
export const ContactList = ({ contacts, onSelect }: ContactListProps) => {
  // Every string comes from the plugin's translations.
  const { t } = Hooks.useTranslation(ns);
  if (contacts.length === 0) {
    return (
      <Status.Empty icon='ph--address-book--regular'>
        {t('empty.message')}
      </Status.Empty>
    );
  }

  const items = contacts.map(({ id, name }) => ({ value: id, label: name }));
  return (
    <Listbox.Root items={items} onValueChange={([id]) => id && onSelect?.(id)}>
      <Listbox.Viewport>
        <Listbox.Content aria-label={t('list.label')}>
          {items.map((item) => (
            <Listbox.Item key={item.value} item={item} />
          ))}
        </Listbox.Content>
      </Listbox.Viewport>
    </Listbox.Root>
  );
};
// #endregion

// #region story
export default {
  title: 'contacts/ContactList',
  component: ContactList,
  decorators: [withTheme()],
  // react-ui's strings, and the component's own.
  parameters: { translations: [...uiTranslations, ...translations] },
};

export const Default = {
  args: {
    contacts: [
      { id: 'ada', name: 'Ada Lovelace' },
      { id: 'grace', name: 'Grace Hopper' },
    ],
  },
};

export const NoContacts = { args: { contacts: [] } };
// #endregion
