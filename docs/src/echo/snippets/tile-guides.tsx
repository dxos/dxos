//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Status from '@dxos/react-ui/Status';
import { withTheme } from '@dxos/react-ui/testing';
import * as Theme from '@dxos/react-ui/Theme';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { translations as uiTranslations } from '@dxos/react-ui/translations';
import * as Typography from '@dxos/react-ui/Typography';

// #region resource
const ns = 'com.example.contacts';

export const translations = [
  {
    'en-US': {
      [ns]: {
        'add.label': 'Add contact',
        'count.label_one': '{{count}} contact',
        'count.label_other': '{{count}} contacts',
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
  onAdd?: () => void;
};

/** Takes its data and callbacks as props; a container reads them from the app and passes them in. */
export const ContactList = ({ contacts, onAdd }: ContactListProps) => (
  <Panel.Root>
    <Panel.Header>
      <Toolbar.Root>
        <Toolbar.Separator variant='gap' />
        <Button.Root
          icon='ph--plus--regular'
          label='Add contact'
          iconOnly
          onClick={onAdd}
        />
      </Toolbar.Root>
    </Panel.Header>
    <Panel.Body asChild>
      <ScrollArea.Root>
        <ScrollArea.Viewport>
          {contacts.length === 0 ? (
            <Status.Empty icon='ph--address-book--regular'>
              No contacts yet
            </Status.Empty>
          ) : (
            contacts.map(({ id, name }) => (
              <Typography.Text key={id}>{name}</Typography.Text>
            ))
          )}
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Panel.Body>
  </Panel.Root>
);
// #endregion

// #region story
export default {
  title: 'contacts/ContactList',
  component: ContactList,
  decorators: [withTheme()],
  parameters: { translations: uiTranslations },
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
