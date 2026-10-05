//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { generateName } from '@dxos/display-name';
import { type PublicKey } from '@dxos/keys';
import { requirePublicKey, toPublicKey } from '@dxos/protocols/buf';
import { type Contact } from '@dxos/react-client/halo';
import { Listbox } from '@dxos/react-ui-list';
import * as Avatar from '@dxos/react-ui/Avatar';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import * as Tooltip from '@dxos/react-ui/Tooltip';
import * as Util from '@dxos/react-ui/Util';
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

export type ContactListProps = Util.ThemedClassName<{
  contacts: Contact[];
  spaces: ContactSpace[];
  filter?: string;
  onSelectSpace?: (space: ContactSpace) => void;
}>;

export const ContactList = ({ classNames, contacts, spaces, filter = '', onSelectSpace }: ContactListProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  // filterContacts returns the input array unchanged when the filter is empty, so copy before sorting to avoid mutating the caller's prop.
  const visible = useMemo(
    () =>
      [...filterContacts(contacts, filter)].sort((a, b) => contactDisplayName(a).localeCompare(contactDisplayName(b))),
    [contacts, filter],
  );

  if (visible.length === 0) {
    return <p className='text-fg-muted text-center my-2'>{t('empty-contacts.message')}</p>;
  }

  return (
    <Listbox.Root
      items={visible.map((contact) => ({ value: contactKeyHex(contact), label: contactDisplayName(contact) }))}
    >
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

/** The avatar in the icon rail, the name over its shared-space tags, and the key with its copy button at the end. */
const ContactListItem = ({ contact, spaces, onSelectSpace }: ContactListItemProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  const labelId = Hooks.useId('contactListItem__label');
  const identityKey = requirePublicKey(contact.identityKey);
  const fallback = keyToFallback(identityKey);
  const displayName = contactDisplayName(contact);
  const common = (contact.commonSpaces ?? [])
    .map((key) => spaces.find((space) => toPublicKey(key)?.equals(space.key)))
    .filter((space): space is ContactSpace => space !== undefined);

  return (
    <Listbox.Item classNames='p-2 rounded-sm' id={identityKey.toHex()} data-testid='contact-list.item'>
      <Listbox.ItemIcon>
        <Avatar.Root
          aria-labelledby={labelId}
          size='md'
          hue={Avatar.toAvatarHue(profileString(contact, 'hue') ?? fallback.hue)}
          fallback={profileString(contact, 'emoji') ?? fallback.emoji}
        />
      </Listbox.ItemIcon>
      <Listbox.ItemText id={labelId}>{displayName}</Listbox.ItemText>
      {common.length > 0 && (
        <Listbox.ItemDescription classNames='flex flex-wrap gap-1 pt-2'>
          {common.map((space) => (
            <Button.Root
              key={space.id}
              size='sm'
              hue={getHashStyles(space.id).hue}
              onClick={() => onSelectSpace?.(space)}
              data-testid='contact-list.space'
            >
              {space.name ?? t('unnamed-space.label')}
            </Button.Root>
          ))}
        </Listbox.ItemDescription>
      )}
      <Layout.Flex align='center' gap='xs' classNames='text-sm text-fg-muted'>
        <Tooltip.Trigger asChild content={t(contact.did ? 'identity-did.label' : 'identity-key.label')}>
          <span className='font-mono truncate max-w-48'>{contact.did ?? identityKey.truncate()}</span>
        </Tooltip.Trigger>
        <SystemButton.Clipboard
          iconOnly
          size='sm'
          variant='ghost'
          value={contact.did ?? identityKey.toHex()}
          label={t(contact.did ? 'copy-did.label' : 'copy-key.label')}
        />
      </Layout.Flex>
    </Listbox.Item>
  );
};
