//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { generateName } from '@dxos/display-name';
import { type PublicKey } from '@dxos/keys';
import { requirePublicKey, toPublicKey } from '@dxos/protocols/buf';
import { type Contact } from '@dxos/react-client/halo';
import { Avatar, SystemIconButton, Tag, ThemedClassName, useId, useTranslation } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';
import { getHashStyles } from '@dxos/ui-theme';
import { keyToFallback } from '@dxos/util';

import { translationKey } from '../../translations.ts';
import { profileString } from '../../util/index.ts';

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

export type ContactSpace = { id: string; key: PublicKey; name?: string };

export type ContactListProps = ThemedClassName<{
  contacts: Contact[];
  spaces: ContactSpace[];
  filter?: string;
  onSelectSpace?: (space: ContactSpace) => void;
}>;

export const ContactList = ({ classNames, contacts, spaces, filter = '', onSelectSpace }: ContactListProps) => {
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
      <Listbox.Content
        classNames={[classNames, 'flex flex-col gap-2']}
        aria-label={t('contacts.label')}
        data-testid='contact-list'
      >
        {visible.map((contact) => (
          <ContactListItem
            key={contactKeyHex(contact)}
            contact={contact}
            spaces={spaces}
            onSelectSpace={onSelectSpace}
          />
        ))}
      </Listbox.Content>
    </Listbox.Root>
  );
};

type ContactListItemProps = Pick<ContactListProps, 'spaces' | 'onSelectSpace'> & { contact: Contact };

/** `Listbox.ItemContent` aligns the key and shared-space tags under the name, beside the avatar rail. */
const ContactListItem = ({ contact, spaces, onSelectSpace }: ContactListItemProps) => {
  const { t } = useTranslation(translationKey);
  const labelId = useId('contactListItem__label');
  const identityKey = requirePublicKey(contact.identityKey);
  const fallback = keyToFallback(identityKey);
  const displayName = contactDisplayName(contact);
  const common = (contact.commonSpaces ?? [])
    .map((key) => spaces.find((space) => toPublicKey(key)?.equals(space.key)))
    .filter((space): space is ContactSpace => space !== undefined);

  return (
    <Listbox.Item id={identityKey.toHex()} data-testid='contact-list.item'>
      <Listbox.ItemContent
        icon={
          <Avatar.Root labelId={labelId}>
            <Avatar.Content
              hue={profileString(contact, 'hue') ?? fallback.hue}
              fallback={profileString(contact, 'emoji') ?? fallback.emoji}
            />
          </Avatar.Root>
        }
        title={<span id={labelId}>{displayName}</span>}
        description={
          <div className='flex flex-col gap-1'>
            <div className='flex items-center gap-2'>
              <span className='font-mono truncate' title={identityKey.toHex()}>
                {identityKey.truncate()}
              </span>
              <SystemIconButton.Clipboard
                iconOnly
                variant='ghost'
                size={4}
                value={identityKey.toHex()}
                label={t('copy-key.label')}
              />
            </div>
            {common.length > 0 && (
              <div className='flex flex-wrap gap-1'>
                {common.map((space) => (
                  <Tag key={space.id} hue={getHashStyles(space.id).hue} asChild>
                    <button type='button' onClick={() => onSelectSpace?.(space)} data-testid='contact-list.space'>
                      {space.name ?? t('unnamed-space.label')}
                    </button>
                  </Tag>
                ))}
              </div>
            )}
          </div>
        }
      />
    </Listbox.Item>
  );
};
