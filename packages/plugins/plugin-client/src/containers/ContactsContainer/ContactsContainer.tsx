//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { useSpaces } from '@dxos/react-client/echo';
import { useContacts } from '@dxos/react-client/halo';
import { Form } from '@dxos/react-ui-form';
import * as Field from '@dxos/react-ui/Field';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import { ContactList, type ContactSpace } from '@dxos/shell/react';

import { meta } from '#meta';

export const ContactsContainer = () => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { invokePromise } = Hooks.useOperationInvoker();
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
            {(contacts.length > 1 || filter !== '') && (
              <Field.Root>
                <Input.Root
                  placeholder={t('contacts-search.placeholder')}
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  data-testid='contacts.search'
                />
              </Field.Root>
            )}
            <ContactList
              classNames='mt-3'
              contacts={contacts}
              spaces={contactSpaces}
              filter={filter}
              onSelectSpace={handleSelectSpace}
            />
          </Form.FieldSet>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};
