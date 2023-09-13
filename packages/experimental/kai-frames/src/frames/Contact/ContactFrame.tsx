//
// Copyright 2023 DXOS.org
//

import React, { FC, useEffect, useRef } from 'react';

import { Contact } from '@dxos/kai-types';
import { Space, useQuery } from '@dxos/react-client/echo';

import { ContactStack } from './ContactStack';
import { ContactCard } from '../../cards';
import { useFrameRouter, useFrameContext } from '../../hooks';

const stringSort = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const sort = ({ name: a1, email: a2 }: Contact, { name: b1, email: b2 }: Contact) => stringSort(a1 ?? a2, b1 ?? b2);

// TODO(burdon): Colored tags.
// TODO(burdon): Recent messages.
// TODO(burdon): Tasks.
export const ContactFrame = () => {
  const { space, frame, objectId } = useFrameContext();
  const router = useFrameRouter();

  const contacts = useQuery(space, Contact.filter()).sort(sort);

  const selectedRef = useRef<HTMLDivElement>(null);
  const selected = objectId ? space?.db.getObjectById<Contact>(objectId) : undefined;
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected]);

  const handleSelect = (contact: Contact) => {
    router({ space, frame, objectId: contact.id });
  };

  // TODO(burdon): Factor out.
  const CardList: FC<{
    space: Space;
    objects: Contact[];
    selected?: Contact;
    className?: string;
    onSelect: (selected: Contact) => void;
  }> = ({ space, objects, selected, className, onSelect }) => (
    <div className={className}>
      {objects.map((object) => (
        <div key={object.id} ref={object.id === selected?.id ? selectedRef : undefined} className='flex mb-2 md:mr-2'>
          {/* TODO(burdon): Generalize cards. */}
          {/* TODO(burdon): Constrain width to same as Kanban. */}
          <ContactCard
            slots={{ root: { className: 'w-column' } }}
            space={space}
            object={object}
            selected={object.id === selected?.id}
            onSelect={onSelect}
          />
        </div>
      ))}
    </div>
  );

  if (!space) {
    return null;
  }

  return (
    <div className='flex flex-1 overflow-x-scroll mt-4 md:mx-4'>
      {(selected && (
        <>
          <div className='flex flex-col shrink-0 overflow-y-scroll'>
            <CardList space={space} objects={contacts} selected={selected} onSelect={handleSelect} />
            {/* Allow scrolling to top of last item. */}
            <div className='flex flex-col mb-[100vh]' />
          </div>
          <div className='flex flex-col flex-1 overflow-hidden bg-white'>
            <ContactStack space={space} object={selected} />
          </div>
        </>
      )) || (
        <CardList
          space={space}
          className='flex flex-col flex-wrap'
          objects={contacts}
          selected={selected}
          onSelect={handleSelect}
        />
      )}
    </div>
  );
};

export default ContactFrame;
