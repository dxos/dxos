//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { type Contact } from '@dxos/react-client/halo';
import { Combobox, useTranslation } from '@dxos/react-ui';

import { translationKey } from '../../translations.ts';
import { contactDisplayName, contactKeyHex, filterContacts } from '../ContactList/index.ts';

export type ContactPickerProps = {
  contacts: Contact[];
  /** Identity-key hex of people who must not be offered (e.g. existing members). */
  excludeKeys?: string[];
  /** Selected identity-key hex, if any. */
  value?: string;
  onChange: (key: string | undefined) => void;
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
  const items = useMemo(
    () => candidates.map((contact) => ({ value: contactKeyHex(contact), label: contactDisplayName(contact) })),
    [candidates],
  );

  return (
    <Combobox.Root
      items={items}
      // Candidates are filtered by name and key here (`filterContacts`), not by label alone.
      filter={null}
      value={value ? [value] : []}
      onValueChange={({ value: [key] }) => onChange(key || undefined)}
      inputValue={query}
      onInputValueChange={({ inputValue }) => setQuery(inputValue)}
    >
      {/* Fills the row so the picker takes the space its siblings (role, add) don't. */}
      <Combobox.Trigger
        classNames='grow min-w-0'
        placeholder={t('contact-picker.placeholder')}
        disabled={disabled}
        data-testid='contact-picker.trigger'
      />
      <Combobox.Content>
        <Combobox.Input placeholder={t('contact-picker-search.placeholder')} />
        <Combobox.List>
          {items.map((item) => (
            <Combobox.Item key={item.value} item={item} data-testid='contact-picker.item' />
          ))}
        </Combobox.List>
        {candidates.length === 0 && <Combobox.Empty>{t('contact-picker-empty.message')}</Combobox.Empty>}
      </Combobox.Content>
    </Combobox.Root>
  );
};
