//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type ContactType } from '@braneframe/types';
import { List, ListItem } from '@dxos/react-ui';
import { ghostHover, groupBorder, attentionSurface, mx } from '@dxos/react-ui-theme';

import { styles } from '../styles';

export type ContactListProps = {
  contacts?: ContactType[];
  selected?: string;
  onSelect?: (contact: ContactType) => void;
};

export const ContactList = ({ contacts = [], selected, onSelect }: ContactListProps) => {
  return (
    <div className={mx('flex w-full overflow-y-scroll', attentionSurface)}>
      <List classNames={mx('w-full divide-y', groupBorder)}>
        {contacts.map((contact) => (
          <ListItem.Root
            key={contact.id}
            classNames={mx('flex flex-col cursor-pointer', ghostHover, selected === contact.id && styles.selected)}
            onClick={() => onSelect?.(contact)}
          >
            {contact.name && <ListItem.Heading classNames='p-2'>{contact.name}</ListItem.Heading>}
            <div className='flex flex-col p-2'>
              {contact.identifiers.map(({ value }) => (
                <div key='value' className='text-sm text-neutral-500'>
                  {value}
                </div>
              ))}
            </div>
          </ListItem.Root>
        ))}
      </List>
    </div>
  );
};
