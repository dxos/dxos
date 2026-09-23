//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { generateName } from '@dxos/display-name';
import { type PublicKey } from '@dxos/keys';
import { requirePublicKey, toPublicKey } from '@dxos/protocols/buf';
import { type Contact } from '@dxos/react-client/halo';
import { Button, useTranslation } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';

import { translationKey } from '../../translations.ts';
import { IdentityListItem } from '../IdentityList/index.ts';

export type ContactSpace = { id: string; key: PublicKey; name?: string };

export type ContactListProps = {
  contacts: Contact[];
  spaces: ContactSpace[];
  filter?: string;
  onSelectSpace?: (space: ContactSpace) => void;
};

export const contactKeyHex = (contact: Pick<Contact, 'identityKey'>): string =>
  requirePublicKey(contact.identityKey).toHex();

export const contactDisplayName = (contact: Pick<Contact, 'identityKey' | 'profile'>): string =>
  contact.profile?.displayName ?? generateName(contactKeyHex(contact));

export const filterContacts = (contacts: Contact[], filter: string): Contact[] => {
  const query = filter.trim().toLowerCase();
  if (!query) {
    return contacts;
  }
  return contacts.filter(
    (contact) => contactDisplayName(contact).toLowerCase().includes(query) || contactKeyHex(contact).includes(query),
  );
};

export const ContactList = ({ contacts, spaces, filter = '', onSelectSpace }: ContactListProps) => {
  const { t } = useTranslation(translationKey);
  // filterContacts returns the input array unchanged when the filter is empty, so copy before sorting to avoid mutating the caller's prop.
  const visible = useMemo(
    () =>
      [...filterContacts(contacts, filter)].sort((a, b) => contactDisplayName(a).localeCompare(contactDisplayName(b))),
    [contacts, filter],
  );

  if (visible.length === 0) {
    return <p className='text-description text-center my-2'>{t('empty-contacts.message')}</p>;
  }

  return (
    <Listbox.Root>
      <Listbox.Content classNames='flex flex-col gap-2' aria-label={t('contacts.label')} data-testid='contact-list'>
        {visible.map((contact) => {
          const common = (contact.commonSpaces ?? [])
            .map((key) => spaces.find((space) => toPublicKey(key)?.equals(space.key)))
            .filter((space): space is ContactSpace => space !== undefined);
          return (
            <div key={contactKeyHex(contact)} className='flex flex-col gap-1'>
              <IdentityListItem identity={contact} />
              <div className='flex flex-wrap gap-1 ps-12'>
                {common.map((space) => (
                  <Button
                    key={space.id}
                    variant='ghost'
                    density='sm'
                    onClick={() => onSelectSpace?.(space)}
                    data-testid='contact-list.space'
                  >
                    {space.name ?? t('unnamed-space.label')}
                  </Button>
                ))}
              </div>
            </div>
          );
        })}
      </Listbox.Content>
    </Listbox.Root>
  );
};
