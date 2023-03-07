//
// Copyright 2023 DXOS.org
//

import React, { FC, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Contact, DocumentStack } from '@dxos/kai-types';
import { useQuery } from '@dxos/react-client';
import { Button } from '@dxos/react-components';

import { createPath, useAppRouter } from '../../hooks';
import { ContactCard } from './ContactCard';

const stringSort = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const sort = ({ name: a1, email: a2 }: Contact, { name: b1, email: b2 }: Contact) => stringSort(a1 ?? a2, b1 ?? b2);

// TODO(burdon): Colored tags.
// TODO(burdon): Recent messages.
// TODO(burdon): Tasks.
export const ContactFrame = () => {
  const navigate = useNavigate();
  const { space, frame, objectId } = useAppRouter();
  const contacts = useQuery(space, Contact.filter()).sort(sort);
  const selected = objectId ? space?.db.getObjectById<Contact>(objectId) : undefined;
  const selectedRef = useRef<HTMLDivElement>(null);

  const [stack, setStack] = useState<DocumentStack>();
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (selected) {
      setStack(findStack(selected));
    } else {
      setStack(undefined);
    }
  }, [selected]);

  const findStack = (contact: Contact) => {
    const { objects: stacks } = space!.db.query(DocumentStack.filter());
    return stacks.find((stack) => stack.subjectId === contact.id);
  };

  const handleSelect = (contact: Contact) => {
    navigate(createPath({ spaceKey: space?.key, frame: frame!.module.id, objectId: contact.id }));
  };

  const handleCreateStack = async (contact: Contact) => {
    const stack = await space!.db.add(new DocumentStack({ title: contact.name, subjectId: contact.id }));
    // setStack(stack);
    navigate(createPath({ spaceKey: space?.key, frame: 'dxos.module.frame.stack', objectId: stack.id }));
  };

  const ContactList: FC<{ className?: string }> = ({ className }) => (
    <div className={className}>
      {contacts.map((contact) => (
        <div key={contact.id} ref={contact.id === selected?.id ? selectedRef : undefined} className='flex md:mr-2'>
          {/* TODO(burdon): Generalize cards. */}
          <ContactCard contact={contact} selected={contact.id === selected?.id} onSelect={handleSelect} />
        </div>
      ))}
    </div>
  );

  if (selected) {
    return (
      <div className='flex flex-1 overflow-hidden'>
        <div className='flex flex-col shrink-0 md:m-2 md:mr-0 overflow-y-scroll'>
          <ContactList className='space-y-2 md:mr-1' />
          {/* Allow scrolling to top of last item. */}
          <div className='flex flex-col mb-[100vh]' />
        </div>
        <div className='flex flex-col flex-1 bg-white'>
          <div className='flex p-4'>
            {!stack && (
              <Button variant='primary' onClick={() => handleCreateStack(selected)}>
                Create Stack
              </Button>
            )}

            {stack && <div>{stack.__typename}</div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-1 overflow-x-scroll m-2'>
      {/* TODO(burdon): space-y causes first item of wrapped columns to be indented. */}
      <ContactList className='flex flex-col flex-wrap space-y-2' />
    </div>
  );
};
