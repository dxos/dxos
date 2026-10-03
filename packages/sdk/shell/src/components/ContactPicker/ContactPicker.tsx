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
  const selected = contacts.find((contact) => contactKeyHex(contact) === value);

  return (
    <Combobox.Root
      placeholder={t('contact-picker.placeholder')}
      displayValue={selected && contactDisplayName(selected)}
      value={value ?? ''}
      onValueChange={(key) => onChange(key || undefined)}
    >
      {/* Fills the row so the picker takes the space its siblings (role, add) don't. */}
      <Combobox.Trigger classNames='grow min-w-0' disabled={disabled} data-testid='contact-picker.trigger' />
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
                checked={key === value}
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
