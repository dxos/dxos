//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { useSpaces } from '@dxos/react-client/echo';
import { useContacts } from '@dxos/react-client/halo';
import { useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { SearchList } from '@dxos/react-ui-search';
import { ContactList, type ContactSpace } from '@dxos/shell/react';

import { meta } from '#meta';

export const ContactsContainer = () => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const contacts = useContacts();
  const spaces = useSpaces();
  const [filter, setFilter] = useState('');
  const contactSpaces = useMemo(
    (): ContactSpace[] => spaces.map((space) => ({ id: space.id, key: space.key, name: space.properties.name })),
    [spaces],
  );

  const handleSelectSpace = (selected: ContactSpace) =>
    void invokePromise(LayoutOperation.SwitchWorkspace, { subject: GraphPath.getSpacePath(selected.id) });

  return (
    <Form.Root variant='settings'>
      <Form.Viewport scroll>
        <Form.Content>
          <Form.FieldSet label={t('contacts.label')} description={t('contacts.description')}>
            <SearchList.Root onSearch={setFilter}>
              <SearchList.Input placeholder={t('contacts-search.placeholder')} data-testid='contacts.search' />
              <ContactList
                contacts={contacts}
                spaces={contactSpaces}
                filter={filter}
                onSelectSpace={handleSelectSpace}
              />
            </SearchList.Root>
          </Form.FieldSet>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

ContactsContainer.displayName = 'ContactsContainer';
