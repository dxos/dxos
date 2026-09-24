//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { type Contact } from '@dxos/react-client/halo';
import { useTranslation } from '@dxos/react-ui';
import { Combobox } from '@dxos/react-ui-list';

import { translationKey } from '../../translations.ts';
import { contactDisplayName, contactKeyHex, filterContacts } from '../ContactList/index.ts';

export type ContactPickerProps = {
  contacts: Contact[];
  /** Identity-key hex of people who must not be offered (e.g. existing members). */
  excludeKeys?: string[];
  /** Selected identity-key hex strings. */
  value: string[];
  onChange: (keys: string[]) => void;
  disabled?: boolean;
};

export const ContactPicker = ({ contacts, excludeKeys = [], value, onChange, disabled }: ContactPickerProps) => {
  const { t } = useTranslation(translationKey);
  const [query, setQuery] = useState('');
  const candidates = useMemo(
    () =>
      filterContacts(
        contacts.filter((contact) => !excludeKeys.includes(contactKeyHex(contact))),
        query,
      ),
    [contacts, excludeKeys, query],
  );
  const selectedNames = contacts
    .filter((contact) => value.includes(contactKeyHex(contact)))
    .map(contactDisplayName)
    .join(', ');

  const toggle = (key: string) =>
    onChange(value.includes(key) ? value.filter((selected) => selected !== key) : [...value, key]);

  return (
    <Combobox.Root placeholder={t('contact-picker.placeholder')} displayValue={selectedNames} value={value.join(',')}>
      <Combobox.Trigger disabled={disabled} data-testid='contact-picker.trigger' />
      <Combobox.Content>
        <Combobox.Input placeholder={t('contact-picker-search.placeholder')} value={query} onValueChange={setQuery} />
        <Combobox.List>
          {candidates.map((contact) => {
            const key = contactKeyHex(contact);
            return (
              <Combobox.Item
                key={key}
                value={key}
                label={contactDisplayName(contact)}
                checked={value.includes(key)}
                closeOnSelect={false}
                onSelect={() => toggle(key)}
                data-testid='contact-picker.item'
              />
            );
          })}
        </Combobox.List>
        {candidates.length === 0 && <Combobox.Empty>{t('contact-picker-empty.message')}</Combobox.Empty>}
      </Combobox.Content>
    </Combobox.Root>
  );
};
